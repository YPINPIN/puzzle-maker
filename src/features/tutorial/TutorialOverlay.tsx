import { useLayoutEffect, useState } from 'react';
import { useTutorial } from './useTutorial';
import { homeSteps, playSteps, uploadStep, configStep, cropStep } from './tutorialData';
import type { TutorialStep } from './tutorialData';
import { Icon } from '../../components/Icon';

const SPOTLIGHT_PAD = 10;
const CARD_H_ESTIMATE = 240;
const MARGIN = 16;
const GAP = 14;

export default function TutorialOverlay() {
  const { phase, homeStep, playStep, midStepDone, nextHomeStep, nextPlayStep, advanceMidStep } = useTutorial();
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const isMidPage = phase === 'upload' || phase === 'config' || phase === 'crop';
  const isVisible =
    phase === 'home' ||
    phase === 'play' ||
    (isMidPage && !midStepDone);

  const currentStep: TutorialStep | null =
    phase === 'home' ? homeSteps[homeStep] :
    phase === 'play' ? playSteps[playStep] :
    phase === 'upload' ? uploadStep :
    phase === 'config' ? configStep :
    phase === 'crop' ? cropStep :
    null;

  useLayoutEffect(() => {
    const targetId = currentStep?.targetId;
    const update = () => {
      if (!targetId) { setSpotlightRect(null); return; }
      const el = document.querySelector(`[data-tutorial="${targetId}"]`);
      setSpotlightRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener('resize', update);

    // 目標元素的 style 可能在非同步操作後才被設定（如 crop-image 等待 img.onload），
    // 用 MutationObserver 監聽 style 變動，確保 spotlight 跟著更新
    const el = targetId ? document.querySelector(`[data-tutorial="${targetId}"]`) : null;
    const observer = el ? new MutationObserver(update) : null;
    observer?.observe(el!, { attributes: true, attributeFilter: ['style'] });

    return () => {
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [currentStep]);

  if (!isVisible || !currentStep) return null;

  const onNext =
    phase === 'home' ? nextHomeStep :
    phase === 'play' ? nextPlayStep :
    advanceMidStep;

  const spotlightStyle: React.CSSProperties | undefined = spotlightRect
    ? {
        position: 'fixed',
        left: spotlightRect.left - SPOTLIGHT_PAD,
        top: spotlightRect.top - SPOTLIGHT_PAD,
        width: spotlightRect.width + SPOTLIGHT_PAD * 2,
        height: spotlightRect.height + SPOTLIGHT_PAD * 2,
        borderRadius: 12,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
        outline: '2px solid rgba(44,196,186,0.8)',
        outlineOffset: 1,
        zIndex: 9997,
        pointerEvents: 'none',
        transition: 'left 0.25s ease, top 0.25s ease, width 0.25s ease, height 0.25s ease',
      }
    : undefined;

  const tooltipStyle = computeTooltipPosition(spotlightRect);

  return (
    <>
      {/* 全頁互動攔截層 */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9996, pointerEvents: 'all' }} />

      {/* 無 spotlight 時的暗色遮罩 */}
      {!spotlightRect && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9997 }} />
      )}

      {/* Spotlight 聚光圓 */}
      {spotlightRect && <div style={spotlightStyle} />}

      {/* 教學卡片 */}
      <div
        style={{
          ...tooltipStyle,
          zIndex: 9999,
          position: 'fixed',
          maxWidth: 360,
          width: 'calc(100vw - 32px)',
          background: 'linear-gradient(145deg, #FFF9EE 0%, #FFF3DC 100%)',
          border: '1.5px solid rgba(42,163,154,0.35)',
          borderRadius: 20,
          padding: '20px 20px 16px',
          boxShadow: '0 12px 48px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.3)',
          pointerEvents: 'all',
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16, fontWeight: 700, color: '#251E15', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 7 }}>
          {currentStep.titleIcon && (
            <span style={{ color: '#1A8C85', flexShrink: 0 }}>
              <Icon name={currentStep.titleIcon} size={18} />
            </span>
          )}
          {currentStep.title}
        </h3>
        <p style={{ margin: 0, marginBottom: 16, fontSize: 14, color: '#4A3C2A', lineHeight: 1.65 }}>
          {highlightText(currentStep.message, currentStep.highlights ?? [])}
        </p>
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '11px 16px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #2EC4BA 0%, #1A8C85 100%)',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3), 0 2px 8px rgba(42,163,154,.4)',
            letterSpacing: 0.3,
          }}
        >
          {currentStep.ctaLabel}
        </button>
      </div>
    </>
  );
}

function highlightText(text: string, highlights: string[]): React.ReactNode {
  if (!highlights.length) return text;
  type Part = string | React.ReactElement;
  let parts: Part[] = [text];
  for (const term of highlights) {
    const next: Part[] = [];
    for (let i = 0; i < parts.length; i++) {
      const node = parts[i];
      if (typeof node !== 'string') { next.push(node); continue; }
      const segs = node.split(term);
      for (let j = 0; j < segs.length; j++) {
        if (segs[j]) next.push(segs[j]);
        if (j < segs.length - 1) next.push(<span key={`${i}-${j}`} style={{ color: '#1A8C85', fontWeight: 700 }}>{term}</span>);
      }
    }
    parts = next;
  }
  return <>{parts}</>;
}

function computeTooltipPosition(rect: DOMRect | null): React.CSSProperties {
  if (!rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const spaceBelow = window.innerHeight - rect.bottom - GAP;
  const spaceAbove = rect.top - GAP;
  const preferBelow = spaceBelow >= CARD_H_ESTIMATE || spaceBelow >= spaceAbove;

  const rawTop = preferBelow ? rect.bottom + GAP : rect.top - GAP - CARD_H_ESTIMATE;
  const top = Math.max(MARGIN, Math.min(window.innerHeight - CARD_H_ESTIMATE - MARGIN, rawTop));

  const idealLeft = rect.left + rect.width / 2 - 180;
  const left = Math.max(MARGIN, Math.min(window.innerWidth - 360 - MARGIN, idealLeft));

  return { top, left };
}
