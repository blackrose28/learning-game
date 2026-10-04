import type { ElementType } from '@math-archer/learning-engine';
import type { ArrowEffectVisual } from './arrowEffects';

export interface ElementVisualProfile {
  name: string;
  glyph: string;
  description: string;
  arrowheadShape: string;
  fletchingShape: string;
  shaftDetail: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  shaftColor: string;
  accentColor: string;
}

export const ELEMENTAL_PROFILES: Record<ElementType, ElementVisualProfile> = {
  fire: {
    name: 'Fire Arrow',
    glyph: '🔥',
    description:
      'Serrated flame-bladed arrowhead with charred ashwood shaft and flickering plume fletchings',
    arrowheadShape: 'serrated-flame-blade',
    fletchingShape: 'flame-plume-vanes',
    shaftDetail: 'engraved-flame-runes',
    primaryColor: '#ef4444',
    secondaryColor: '#f97316',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    shaftColor: '#78350f',
    accentColor: '#fbbf24',
  },
  ice: {
    name: 'Ice Arrow',
    glyph: '❄️',
    description:
      'Diamond-faceted crystalline arrowhead with pale birch shaft and sharp ice-shard vanes',
    arrowheadShape: 'diamond-crystal-prism',
    fletchingShape: 'crystal-shard-vanes',
    shaftDetail: 'frost-lattice-runes',
    primaryColor: '#0284c7',
    secondaryColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.7)',
    shaftColor: '#cbd5e1',
    accentColor: '#e0f2fe',
  },
  wind: {
    name: 'Wind Arrow',
    glyph: '💨',
    description:
      'Aerodynamic twin-crescent winged arrowhead with bamboo shaft and swept falcon feathers',
    arrowheadShape: 'aerodynamic-winged-crescent',
    fletchingShape: 'swept-falcon-feathers',
    shaftDetail: 'zephyr-spiral-currents',
    primaryColor: '#059669',
    secondaryColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.7)',
    shaftColor: '#b45309',
    accentColor: '#a7f3d0',
  },
  earth: {
    name: 'Earth Arrow',
    glyph: '🪨',
    description:
      'Heavy chiseled stone broadhead with banded oak shaft and square-cut rugged hide vanes',
    arrowheadShape: 'chiseled-stone-broadhead',
    fletchingShape: 'square-notched-hide-vanes',
    shaftDetail: 'bronze-banded-bindings',
    primaryColor: '#b45309',
    secondaryColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.7)',
    shaftColor: '#451a03',
    accentColor: '#fde68a',
  },
};

export const renderEffectMotifs = (
  effect: ArrowEffectVisual,
  orientation: 'horizontal' | 'vertical'
) => {
  if (orientation === 'vertical') {
    switch (effect.particleType) {
      case 'star':
        return (
          <g className="effect-motifs-star" fill={effect.glowColor}>
            <polygon points="30,30 31.5,33 34.5,34.5 31.5,36 30,39 28.5,36 25.5,34.5 28.5,33" />
            <polygon points="26,60 27.5,63 30.5,64.5 27.5,66 26,69 24.5,66 21.5,64.5 24.5,63" />
            <polygon points="34,85 35.5,88 38.5,89.5 35.5,91 34,94 32.5,91 29.5,89.5 32.5,88" />
            <circle cx="30" cy="48" r="1.5" fill="#ffffff" />
            <circle cx="28" cy="74" r="1.2" fill="#ffffff" />
            <circle cx="32" cy="100" r="1.5" fill="#ffffff" />
          </g>
        );
      case 'spark':
        return (
          <g className="effect-motifs-spark" stroke={effect.glowColor} strokeWidth="1.2">
            <line x1="27" y1="40" x2="33" y2="40" />
            <line x1="30" y1="37" x2="30" y2="43" />
            <line x1="26" y1="70" x2="32" y2="70" />
            <line x1="29" y1="67" x2="29" y2="73" />
            <line x1="28" y1="95" x2="34" y2="95" />
            <line x1="31" y1="92" x2="31" y2="98" />
          </g>
        );
      case 'ember':
        return (
          <g className="effect-motifs-ember">
            <circle cx="28" cy="35" r="2.2" fill="#fed7aa" />
            <circle cx="32" cy="55" r="1.8" fill="#f97316" />
            <circle cx="27" cy="75" r="2.4" fill="#ea580c" />
            <circle cx="33" cy="95" r="2" fill="#ffedd5" />
            <path
              d="M 30 110 Q 25 80 30 50 Q 35 20 30 10"
              stroke="#f97316"
              strokeWidth="1"
              strokeDasharray="3 3"
              fill="none"
              opacity="0.6"
            />
          </g>
        );
      case 'rainbow':
        return (
          <g className="effect-motifs-rainbow">
            <path
              d="M 28 15 Q 34 45 27 75 Q 33 100 29 110"
              stroke="url(#effectRainbowGrad)"
              strokeWidth="2.5"
              fill="none"
              opacity="0.85"
            />
          </g>
        );
      case 'lightning':
        return (
          <g
            className="effect-motifs-lightning"
            stroke="#7dd3fc"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          >
            <path d="M 30 15 L 26 35 L 34 50 L 26 70 L 33 88 L 30 108" />
          </g>
        );
      case 'void':
        return (
          <g
            className="effect-motifs-void"
            stroke="#c4b5fd"
            strokeWidth="1.5"
            strokeDasharray="3 2"
            fill="none"
            opacity="0.8"
          >
            <ellipse cx="30" cy="35" rx="5" ry="3" />
            <ellipse cx="30" cy="65" rx="6" ry="3.5" />
            <ellipse cx="30" cy="95" rx="5" ry="3" />
          </g>
        );
      case 'sunbeam':
        return (
          <g
            className="effect-motifs-sunbeam"
            stroke="#fef08a"
            strokeWidth="1.4"
            strokeLinecap="round"
          >
            <line x1="30" y1="105" x2="20" y2="115" />
            <line x1="30" y1="105" x2="40" y2="115" />
            <line x1="30" y1="80" x2="22" y2="85" />
            <line x1="30" y1="80" x2="38" y2="85" />
            <circle cx="30" cy="110" r="3" fill="#fef08a" opacity="0.8" />
          </g>
        );
      case 'petal':
        return (
          <g className="effect-motifs-petal" fill="#f472b6" opacity="0.85">
            <path d="M 26 35 C 23 38 25 43 29 41 C 31 39 29 34 26 35 Z" />
            <path d="M 34 65 C 37 68 35 73 31 71 C 29 69 31 64 34 65 Z" />
            <path d="M 27 92 C 24 95 26 100 30 98 C 32 96 30 91 27 92 Z" />
          </g>
        );
      case 'ice':
        return (
          <g className="effect-motifs-ice" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.8">
            <polygon points="30,35 34,42 30,49 26,42" />
            <polygon points="28,68 33,74 29,81 24,75" />
            <polygon points="31,95 35,101 31,107 27,101" />
          </g>
        );
      case 'dragon':
        return (
          <g
            className="effect-motifs-dragon"
            stroke="#f97316"
            strokeWidth="2"
            fill="none"
            opacity="0.85"
          >
            <path d="M 30 20 Q 24 45 34 70 Q 25 95 30 110" />
            <circle cx="30" cy="110" r="3.5" fill="#dc2626" />
          </g>
        );
      case 'meteor':
        return (
          <g className="effect-motifs-meteor">
            <line
              x1="30"
              y1="20"
              x2="30"
              y2="105"
              stroke="#06b6d4"
              strokeWidth="2.5"
              opacity="0.75"
            />
            <ellipse cx="30" cy="108" rx="4" ry="5" fill="#a5f3fc" />
          </g>
        );
      case 'phoenix':
        return (
          <g className="effect-motifs-phoenix">
            <path
              d="M 30 25 Q 36 50 26 75 Q 34 95 30 110"
              stroke="#f59e0b"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="26" cy="45" r="2" fill="#ef4444" />
            <circle cx="34" cy="70" r="2" fill="#fbbf24" />
            <circle cx="28" cy="98" r="2" fill="#ef4444" />
          </g>
        );
      case 'supernova':
      default:
        return (
          <g className="effect-motifs-supernova">
            <ellipse
              cx="30"
              cy="105"
              rx="8"
              ry="4"
              stroke={effect.primaryColor}
              strokeWidth="1.2"
              fill="none"
              opacity="0.85"
            />
            <ellipse
              cx="30"
              cy="65"
              rx="6"
              ry="3"
              stroke={effect.glowColor}
              strokeWidth="1"
              fill="none"
              opacity="0.7"
            />
            <polygon
              points="30,100 32,104 36,106 32,108 30,112 28,108 24,106 28,104"
              fill={effect.glowColor}
            />
          </g>
        );
    }
  }

  // Horizontal orientation
  switch (effect.particleType) {
    case 'star':
      return (
        <g className="effect-motifs-star" fill={effect.glowColor}>
          <polygon points="36,12 37.5,14 40.5,15 37.5,16 36,18 34.5,16 31.5,15 34.5,14" />
          <polygon points="66,24 67.5,26 70.5,27 67.5,28 66,30 64.5,28 61.5,27 64.5,26" />
          <polygon points="96,12 97.5,14 100.5,15 97.5,16 96,18 94.5,16 91.5,15 94.5,14" />
          <polygon points="120,24 121.5,26 124.5,27 121.5,28 120,30 118.5,28 115.5,27 118.5,26" />
          <circle cx="52" cy="18" r="1.5" fill="#ffffff" />
          <circle cx="82" cy="18" r="1.5" fill="#ffffff" />
          <circle cx="108" cy="18" r="1.8" fill="#ffffff" />
        </g>
      );
    case 'spark':
      return (
        <g className="effect-motifs-spark" stroke={effect.glowColor} strokeWidth="1.2">
          <line x1="33" y1="13" x2="39" y2="13" />
          <line x1="36" y1="10" x2="36" y2="16" />
          <line x1="65" y1="23" x2="71" y2="23" />
          <line x1="68" y1="20" x2="68" y2="26" />
          <line x1="93" y1="13" x2="99" y2="13" />
          <line x1="96" y1="10" x2="96" y2="16" />
          <line x1="117" y1="22" x2="123" y2="22" />
          <line x1="120" y1="19" x2="120" y2="25" />
        </g>
      );
    case 'ember':
      return (
        <g className="effect-motifs-ember">
          <circle cx="35" cy="12" r="2.2" fill="#fed7aa" />
          <circle cx="65" cy="24" r="2.5" fill="#f97316" />
          <circle cx="95" cy="12" r="1.8" fill="#ea580c" />
          <circle cx="120" cy="24" r="2.2" fill="#ffedd5" />
          <path
            d="M 20 18 Q 45 10 75 22 Q 105 12 125 18"
            stroke="#f97316"
            strokeWidth="1"
            strokeDasharray="3 3"
            fill="none"
            opacity="0.6"
          />
        </g>
      );
    case 'rainbow':
      return (
        <g className="effect-motifs-rainbow">
          <path
            d="M 16 15 Q 45 8 80 18 Q 110 26 135 15"
            stroke="url(#effectRainbowGrad)"
            strokeWidth="2.5"
            fill="none"
            opacity="0.85"
          />
        </g>
      );
    case 'lightning':
      return (
        <g
          className="effect-motifs-lightning"
          stroke="#7dd3fc"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        >
          <path d="M 18 18 L 38 12 L 52 23 L 74 13 L 90 23 L 112 14 L 126 18" />
        </g>
      );
    case 'void':
      return (
        <g
          className="effect-motifs-void"
          stroke="#c4b5fd"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          fill="none"
          opacity="0.8"
        >
          <ellipse cx="36" cy="18" rx="8" ry="4" />
          <ellipse cx="68" cy="18" rx="9" ry="4.5" />
          <ellipse cx="100" cy="18" rx="8" ry="4" />
        </g>
      );
    case 'sunbeam':
      return (
        <g
          className="effect-motifs-sunbeam"
          stroke="#fef08a"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <line x1="126" y1="18" x2="137" y2="8" />
          <line x1="126" y1="18" x2="137" y2="28" />
          <line x1="100" y1="18" x2="108" y2="10" />
          <line x1="100" y1="18" x2="108" y2="26" />
          <circle cx="126" cy="18" r="3.5" fill="#fef08a" opacity="0.8" />
        </g>
      );
    case 'petal':
      return (
        <g className="effect-motifs-petal" fill="#f472b6" opacity="0.85">
          <path d="M 38 12 C 42 9 47 13 44 16 C 41 17 38 15 38 12 Z" />
          <path d="M 68 24 C 72 21 77 25 74 28 C 71 29 68 27 68 24 Z" />
          <path d="M 98 12 C 102 9 107 13 104 16 C 101 17 98 15 98 12 Z" />
        </g>
      );
    case 'ice':
      return (
        <g className="effect-motifs-ice" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.8">
          <polygon points="36,18 43,14 50,18 43,22" />
          <polygon points="68,18 75,13 82,18 75,23" />
          <polygon points="98,18 105,14 112,18 105,22" />
        </g>
      );
    case 'dragon':
      return (
        <g
          className="effect-motifs-dragon"
          stroke="#f97316"
          strokeWidth="2"
          fill="none"
          opacity="0.85"
        >
          <path d="M 22 18 Q 45 10 70 22 Q 95 12 118 20 Q 130 14 136 18" />
          <circle cx="128" cy="18" r="3.5" fill="#dc2626" />
        </g>
      );
    case 'meteor':
      return (
        <g className="effect-motifs-meteor">
          <line
            x1="20"
            y1="18"
            x2="120"
            y2="18"
            stroke="#06b6d4"
            strokeWidth="2.5"
            opacity="0.75"
          />
          <ellipse cx="125" cy="18" rx="6" ry="3.5" fill="#a5f3fc" />
        </g>
      );
    case 'phoenix':
      return (
        <g className="effect-motifs-phoenix">
          <path
            d="M 26 22 Q 55 12 85 22 Q 105 14 125 18"
            stroke="#f59e0b"
            strokeWidth="2"
            fill="none"
          />
          <circle cx="45" cy="12" r="2" fill="#ef4444" />
          <circle cx="75" cy="24" r="2" fill="#fbbf24" />
          <circle cx="105" cy="12" r="2" fill="#ef4444" />
        </g>
      );
    case 'supernova':
    default:
      return (
        <g className="effect-motifs-supernova">
          <ellipse
            cx="124"
            cy="18"
            rx="5"
            ry="9"
            stroke={effect.primaryColor}
            strokeWidth="1.2"
            fill="none"
            opacity="0.85"
          />
          <ellipse
            cx="70"
            cy="18"
            rx="4"
            ry="7"
            stroke={effect.glowColor}
            strokeWidth="1"
            fill="none"
            opacity="0.7"
          />
          <polygon points="126,18 129,15 134,18 129,21" fill={effect.glowColor} />
        </g>
      );
  }
};
