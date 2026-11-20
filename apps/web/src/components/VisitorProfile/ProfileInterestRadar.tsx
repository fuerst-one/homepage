"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type {
  ProfileFacet,
  ProfileInterest,
} from "@homepage/content/visitorProfile";
import {
  MAX_PROFILE_SCORE,
  facetHues,
  termLabel,
  radarSlots,
  type RadarSlot,
} from "./profilePresentation";

const SIZE = 200;
const CENTER = SIZE / 2;
const CHART_RADIUS = 52;
const LABEL_RADIUS = 66;
const RINGS = 4;
const TRANSITION_MS = 450;

type Point = { x: number; y: number };
type Transition = { from: RadarSlot[]; to: RadarSlot[]; progress: number };

const at = (slot: number, count: number, radius: number) => {
  const angle = (slot / count) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
    cos: Math.cos(angle),
    sin: Math.sin(angle),
  };
};
// The radius follows the square root, so a weak interest stays visible beside
// a dominant one; the exact values stay next to every axis label.
const radiusOf = (value: number) =>
  Math.sqrt(Math.max(value, 0)) * CHART_RADIUS;
const midpoint = (a: Point, b: Point) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
const points = (list: Point[]) =>
  list.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
/** Blends along the shorter way round the colour wheel. */
const blendHue = (from: number, to: number, t: number) =>
  (from + (((to - from + 540) % 360) - 180) * t + 360) % 360;
const hueStyle = (hue: number) => ({ "--facet-hue": hue }) as CSSProperties;

/** What each slot shows at `progress`: values and colours blend in place. */
function blend({ from, to, progress }: Transition) {
  return to.map((target, slot) => {
    const source = from[slot];
    const same = source.interest?.id === target.interest?.id;
    return {
      value: source.value + (target.value - source.value) * progress,
      hue: blendHue(source.hue, target.hue, progress),
      presence:
        (source.interest ? 1 - progress : 0) + (target.interest ? progress : 0),
      // The outgoing label fades out before the incoming one fades in, so
      // two labels never share a slot at full strength.
      leaving: same ? null : source.interest,
      leavingOpacity: Math.max(0, 1 - progress * 2),
      entering: target.interest,
      enteringOpacity: same ? 1 : Math.max(0, progress * 2 - 1),
    };
  });
}

/** Animates every slot from what is drawn to `slots`. */
function useRadarTransition(slots: RadarSlot[]) {
  const [transition, setTransition] = useState<Transition>({
    from: slots,
    to: slots,
    progress: 1,
  });
  const drawn = useRef(transition);
  const latest = useRef(slots);
  useLayoutEffect(() => {
    drawn.current = transition;
    latest.current = slots;
  });
  const target = slots
    .map(({ interest, value }) => `${interest?.id}:${value}`)
    .join();

  const animatedTo = useRef(target);
  useEffect(() => {
    // The first render already shows its target.
    if (animatedTo.current === target) return;
    animatedTo.current = target;
    const to = latest.current;
    const current = drawn.current;
    // A new filter mid-transition continues from what is on screen.
    const shown = blend(current);
    const from = shown.map((slot, i) => ({
      interest:
        current.progress < 0.5
          ? current.from[i].interest
          : current.to[i].interest,
      hue: slot.hue,
      value: slot.value,
    }));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTransition({ from: to, to, progress: 1 });
      return;
    }
    const start = performance.now();
    let request = 0;
    const step = (now: number) => {
      const progress = Math.min((now - start) / TRANSITION_MS, 1);
      setTransition({ from, to, progress: ease(progress) });
      if (progress < 1) request = requestAnimationFrame(step);
    };
    request = requestAnimationFrame(step);
    return () => cancelAnimationFrame(request);
  }, [target]);
  return blend(transition);
}

export function ProfileInterestRadar({
  interests,
  facet,
  selectedId,
  onSelect,
  de,
}: {
  interests: ProfileInterest[];
  facet: ProfileFacet | "all";
  selectedId?: string;
  onSelect: (id: string) => void;
  de: boolean;
}) {
  const shown = useRadarTransition(radarSlots(interests, facet));
  const count = shown.length;
  // Just outside the outer ring, between the first two axes.
  const scaleLabel = at(0.5, count, CHART_RADIUS + 5);
  const outline = shown.map(({ value }, slot) =>
    at(slot, count, radiusOf(value)),
  );
  // Each slot owns the part of the shape halfway to its neighbours, so the
  // shape reads as coloured sections.
  const sectors = outline.map((point, slot) => {
    const before = midpoint(outline[(slot + count - 1) % count], point);
    const after = midpoint(point, outline[(slot + 1) % count]);
    return {
      area: [{ x: CENTER, y: CENTER }, before, point, after],
      edge: [before, point, after],
    };
  });
  const label = (interest: ProfileInterest) =>
    `${termLabel(interest, de ? "de" : "en")}: ${interest.score.toFixed(1)} / ${MAX_PROFILE_SCORE}`;
  const labelStyle = (slot: number, hue: number, opacity: number) => {
    const { x, y, cos, sin } = at(slot, count, LABEL_RADIUS);
    const left = (x / SIZE) * 100;
    // Wide enough to wrap names, narrow enough to stay inside the chart.
    const maxWidth = Math.min(
      32,
      (100 - left) / Math.max(0.5 + cos / 2, 0.01),
      left / Math.max(0.5 - cos / 2, 0.01),
    );
    return {
      ...hueStyle(hue),
      opacity,
      maxWidth: `${maxWidth}%`,
      left: `${left}%`,
      top: `${(y / SIZE) * 100}%`,
      // Anchors the label on the side facing away from the chart.
      "--label-x": `${-50 + cos * 50}%`,
      "--label-y": `${-50 + sin * 50}%`,
      textAlign: cos > 0.3 ? "left" : cos < -0.3 ? "right" : "center",
    } as CSSProperties;
  };
  const labelContent = (interest: ProfileInterest) => (
    <>
      <span className="profile-radar-name">
        {termLabel(interest, de ? "de" : "en")}
      </span>
      <span className="profile-radar-score">{interest.score.toFixed(1)}</span>
    </>
  );

  return (
    <div
      className="profile-radar"
      role="group"
      aria-label={
        de ? "Deine stärksten Interessen" : "Your strongest interests"
      }
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        {Array.from({ length: RINGS }, (_, ring) => (
          <circle
            key={ring}
            className="profile-radar-ring"
            cx={CENTER}
            cy={CENTER}
            r={radiusOf((ring + 1) / RINGS)}
          />
        ))}
        {shown.map(({ hue, entering }, slot) => {
          const end = at(slot, count, CHART_RADIUS);
          return (
            <line
              key={slot}
              className="profile-radar-axis"
              style={hueStyle(hue)}
              data-selected={
                (entering && entering.id === selectedId) || undefined
              }
              x1={CENTER}
              y1={CENTER}
              x2={end.x}
              y2={end.y}
            />
          );
        })}
        {sectors.map(({ area, edge }, slot) => (
          <g key={slot} style={hueStyle(shown[slot].hue)}>
            <polygon className="profile-radar-sector" points={points(area)} />
            <polyline className="profile-radar-edge" points={points(edge)} />
          </g>
        ))}
        {shown.map(({ hue, presence, entering }, slot) => (
          <circle
            key={slot}
            className="profile-radar-point"
            style={{ ...hueStyle(hue), opacity: presence }}
            data-selected={
              (entering && entering.id === selectedId) || undefined
            }
            cx={outline[slot].x}
            cy={outline[slot].y}
            r={entering && entering.id === selectedId ? 3.2 : 2}
          />
        ))}
        <text
          className="profile-radar-scale"
          x={scaleLabel.x}
          y={scaleLabel.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {MAX_PROFILE_SCORE}
        </text>
      </svg>
      {shown.map(
        ({ leaving, leavingOpacity, entering, enteringOpacity }, slot) => (
          <span key={slot}>
            {leaving && leavingOpacity > 0 && (
              <span
                className="profile-radar-label"
                style={labelStyle(
                  slot,
                  facetHues[leaving.facet],
                  leavingOpacity,
                )}
                aria-hidden="true"
              >
                {labelContent(leaving)}
              </span>
            )}
            {entering && (
              <button
                type="button"
                className="profile-radar-label"
                style={labelStyle(
                  slot,
                  facetHues[entering.facet],
                  enteringOpacity,
                )}
                aria-pressed={entering.id === selectedId}
                aria-label={label(entering)}
                onClick={() => onSelect(entering.id)}
              >
                {labelContent(entering)}
              </button>
            )}
          </span>
        ),
      )}
    </div>
  );
}
