import { useCallback, useEffect, useRef, useState } from 'react';
import EditorLayout from './components/EditorLayout';
import ExportModal from './components/ExportModal';
import TopToolbar from './components/TopToolbar';
import UploadScreen from './components/UploadScreen';
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useCuts } from './hooks/useCuts';
import { useOverlays } from './hooks/useOverlays';
import { useTimelineZoom } from './hooks/useTimelineZoom';
import type { AnalysisResult, BeatSpacing, TimingPlan } from './types';
import { analyseMp3 } from './utils/api';
import { exportProjectFolder } from './utils/exportFiles';
import { isSuggestedBeatOccupied } from './utils/occupancy';
import { parseOverlayConfig, serializeOverlayConfig } from './utils/overlays';
import { cutsFromTimingPlan, exportTimingPlan } from './utils/timingPlan';
import { clamp } from './utils/time';

export default function App() {
  const mp3Input = useRef<HTMLInputElement>(null);
  const pairInput = useRef<HTMLInputElement>(null);
  const [mp3File, setMp3File] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [suggestedCuts, setSuggestedCuts] = useState<number[]>([]);
  const [beatSpacing, setBeatSpacing] = useState<BeatSpacing[]>([]);
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [autoOnImport, setAutoOnImport] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const cuts = useCuts(duration);
  const zoom = useTimelineZoom();
  const overlayState = useOverlays(duration);
  const flashCut = useCallback(() => { setFlash(true); window.setTimeout(() => setFlash(false), 140); }, []);
  const playback = useAudioPlayback(mp3File, cuts.cuts, selectedCutId, flashCut);

  const selectCut = (id: string | null) => {
    setSelectedCutId(id);
    if (id) overlayState.setSelectedOverlayId(null);
  };
  const selectOverlay = (id: string | null) => {
    overlayState.setSelectedOverlayId(id);
    if (id) setSelectedCutId(null);
  };

  const applyAnalysis = (file: File, result: AnalysisResult, addSuggested: boolean) => {
    setMp3File(file);
    setDuration(result.duration_seconds);
    setPeaks(result.waveform_peaks);
    setSuggestedCuts(result.suggested_cuts);
    setBeatSpacing(result.beat_spacing);
    cuts.resetCuts(addSuggested ? result.suggested_cuts.map((time) => ({ id: crypto.randomUUID(), time, state: 'suggested' as const })) : []);
    setSelectedCutId(null);
    overlayState.resetToDefaults(result.duration_seconds);
    playback.seek(0);
  };

  const analyseFile = async (file: File, addSuggested: boolean) => {
    setAnalysing(true);
    try {
      applyAnalysis(file, await analyseMp3(file), addSuggested);
    } finally {
      setAnalysing(false);
    }
  };

  const importMp3 = (auto: boolean) => {
    setAutoOnImport(auto);
    mp3Input.current?.click();
  };

  const autoAddSuggested = async () => {
    if (!mp3File) return;
    setAnalysing(true);
    try {
      const result = await analyseMp3(mp3File);
      setDuration(result.duration_seconds);
      setPeaks(result.waveform_peaks);
      setSuggestedCuts(result.suggested_cuts);
      setBeatSpacing(result.beat_spacing);
      const missing = result.suggested_cuts.filter((time) => !isSuggestedBeatOccupied(time, cuts.cuts, result.beat_spacing, result.suggested_cuts));
      cuts.addCuts(missing, 'suggested');
    } finally {
      setAnalysing(false);
    }
  };

  const importPair = () => pairInput.current?.click();

  const handleProjectImport = async (file: File, timingJsonFile: File, overlayJsonFile?: File) => {
    setAnalysing(true);
    try {
      const result = await analyseMp3(file);
      const plan = JSON.parse(await timingJsonFile.text()) as TimingPlan;
      applyAnalysis(file, result, false);
      cuts.resetCuts(cutsFromTimingPlan(plan, result.duration_seconds).map((time) => ({ id: crypto.randomUUID(), time, state: 'imported' as const })));
      if (overlayJsonFile) {
        overlayState.replaceOverlays(parseOverlayConfig(JSON.parse(await overlayJsonFile.text()), result.duration_seconds), result.duration_seconds);
      }
    } finally {
      setAnalysing(false);
    }
  };

  const handlePairFiles = (files: File[]) => {
    const mp3 = files.find((file) => file.name.toLowerCase().endsWith('.mp3') || file.type === 'audio/mpeg');
    const overlayJson = files.find((file) => file.name.toLowerCase().endsWith('.overlays.json'));
    const timingJson = files.find((file) => (file.name.toLowerCase().endsWith('.json') || file.type === 'application/json') && file !== overlayJson);
    if (mp3 && timingJson) void handleProjectImport(mp3, timingJson, overlayJson);
    else alert('Select an MP3 and timing JSON file together. Overlay JSON is optional.');
  };

  const newProject = () => {
    setMp3File(null);
    setDuration(0);
    setPeaks([]);
    setSuggestedCuts([]);
    setBeatSpacing([]);
    cuts.resetCuts([]);
    overlayState.replaceOverlays([], 0);
    setSelectedCutId(null);
    playback.seek(0);
  };

  const nudgeAmount = (shift: boolean) => {
    const base = zoom.zoom >= 8 ? 0.005 : zoom.zoom >= 3 ? 0.02 : 0.08;
    return shift ? base * 5 : base;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        playback.toggle();
      }
      if (e.key.toLowerCase() === 'c') cuts.addCut(playback.currentTime, 'manual');
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCutId) {
        cuts.removeCut(selectedCutId);
        setSelectedCutId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && overlayState.selectedOverlayId) {
        overlayState.deleteSelected();
      }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && selectedCutId) {
        e.preventDefault();
        const selected = cuts.cuts.find((cut) => cut.id === selectedCutId);
        if (selected) cuts.moveCut(selected.id, clamp(selected.time + (e.key === 'ArrowLeft' ? -1 : 1) * nudgeAmount(e.shiftKey), 0, duration));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cuts, playback, selectedCutId, duration, zoom.zoom, overlayState]);

  const exportNow = async (name: string) => {
    if (!mp3File) return;
    setExportError(null);
    try {
      await exportProjectFolder(name, mp3File, exportTimingPlan(cuts.cuts.map((cut) => cut.time), duration), serializeOverlayConfig(overlayState.overlays, duration));
      setExportOpen(false);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
    }
  };

  return <div className="flex h-full flex-col">
    <TopToolbar hasProject={!!mp3File} analysing={analysing} canUndo={cuts.canUndo} canRedo={cuts.canRedo} onNew={newProject} onImportMp3={() => importMp3(true)} onImportPair={importPair} onAutoAdd={autoAddSuggested} onUndo={cuts.undo} onRedo={cuts.redo} onExport={() => setExportOpen(true)}/>
    <input ref={mp3Input} type="file" accept="audio/mpeg,.mp3" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void analyseFile(file, autoOnImport); e.currentTarget.value = ''; }}/>
    <input ref={pairInput} type="file" accept="audio/mpeg,.mp3,application/json,.json" multiple hidden onChange={(e) => { handlePairFiles(Array.from(e.target.files ?? [])); e.currentTarget.value = ''; }}/>
    {mp3File ? <EditorLayout
      duration={duration}
      peaks={peaks}
      cuts={cuts.cuts}
      selectedCutId={selectedCutId}
      currentTime={playback.currentTime}
      isPlaying={playback.isPlaying}
      zoom={zoom.zoom}
      flashing={flash}
      loopEnabled={playback.loopEnabled}
      loopWindow={playback.loopWindow}
      overlays={overlayState.overlays}
      selectedOverlayId={overlayState.selectedOverlayId}
      selectedOverlay={overlayState.selectedOverlay}
      onZoom={zoom.setZoom}
      onSeek={playback.seek}
      onTogglePlay={playback.toggle}
      onAddCut={(time) => cuts.addCut(time, 'manual')}
      onMoveCut={cuts.moveCut}
      onSelectCut={selectCut}
      onRemoveCut={(id) => { cuts.removeCut(id); if (id === selectedCutId) setSelectedCutId(null); }}
      onLoopEnabled={playback.setLoopEnabled}
      onLoopWindow={playback.setLoopWindow}
      onSelectOverlay={selectOverlay}
      onUpdateOverlay={overlayState.updateOverlay}
      onAddOverlay={overlayState.addOverlay}
      onDeleteSelectedOverlay={overlayState.deleteSelected}
      onResetIntroOverlay={overlayState.resetIntroOverlay}
    /> : <UploadScreen onImport={importMp3} onImportPair={importPair} analysing={analysing}/>}
    <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} onExport={exportNow} error={exportError}/>
  </div>;
}
