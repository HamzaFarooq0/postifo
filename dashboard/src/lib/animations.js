// ─── LinkedLens Animation System ────────────────────────────────────────────
// All reusable Framer Motion variants and constants

export const DURATION = {
  fast:   0.15,
  normal: 0.25,
  slow:   0.4,
}

export const EASE = {
  smooth:    [0.4, 0, 0.2, 1],
  bouncy:    [0.34, 1.56, 0.64, 1],
  easeOut:   [0, 0, 0.2, 1],
  easeIn:    [0.4, 0, 1, 1],
}

// ─── Page transitions ────────────────────────────────────────────────────────
export const pageVariants = {
  initial:  { opacity: 0, y: 12 },
  animate:  { opacity: 1, y: 0,  transition: { duration: DURATION.normal, ease: EASE.easeOut } },
  exit:     { opacity: 0, y: -8, transition: { duration: DURATION.fast,   ease: EASE.easeIn  } },
}

// ─── Fade variants ───────────────────────────────────────────────────────────
export const fadeVariants = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1, transition: { duration: DURATION.normal } },
  exit:     { opacity: 0, transition: { duration: DURATION.fast   } },
}

// ─── Slide up variants ───────────────────────────────────────────────────────
export const slideUpVariants = {
  initial:  { opacity: 0, y: 20 },
  animate:  { opacity: 1, y: 0,  transition: { duration: DURATION.normal, ease: EASE.easeOut } },
  exit:     { opacity: 0, y: 10, transition: { duration: DURATION.fast                       } },
}

// ─── Scale variants ──────────────────────────────────────────────────────────
export const scaleVariants = {
  initial:  { opacity: 0, scale: 0.94 },
  animate:  { opacity: 1, scale: 1,    transition: { duration: DURATION.normal, ease: EASE.bouncy } },
  exit:     { opacity: 0, scale: 0.96, transition: { duration: DURATION.fast                      } },
}

// ─── Container stagger ───────────────────────────────────────────────────────
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren:  0.05,
      delayChildren:    0.05,
    },
  },
}

// ─── Stagger children (used inside staggerContainer) ─────────────────────────
export const staggerItem = {
  initial:  { opacity: 0, y: 16 },
  animate:  {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASE.easeOut },
  },
}

// ─── Card hover ──────────────────────────────────────────────────────────────
export const cardHover = {
  rest:  { scale: 1,    y: 0,  transition: { duration: DURATION.fast, ease: EASE.smooth } },
  hover: { scale: 1.01, y: -2, transition: { duration: DURATION.fast, ease: EASE.smooth } },
}

// ─── Button press ────────────────────────────────────────────────────────────
export const buttonPress = {
  whileTap: { scale: 0.97, transition: { duration: 0.1 } },
}

// ─── Slide in from right (for modals, drawers) ───────────────────────────────
export const slideInRight = {
  initial:  { opacity: 0, x: 40  },
  animate:  { opacity: 1, x: 0,   transition: { duration: DURATION.normal, ease: EASE.easeOut } },
  exit:     { opacity: 0, x: 40,  transition: { duration: DURATION.fast                       } },
}

// ─── Slide down (for dropdowns) ──────────────────────────────────────────────
export const slideDown = {
  initial:  { opacity: 0, height: 0, overflow: 'hidden' },
  animate:  { opacity: 1, height: 'auto', overflow: 'hidden', transition: { duration: DURATION.normal } },
  exit:     { opacity: 0, height: 0, overflow: 'hidden', transition: { duration: DURATION.fast        } },
}

// ─── Toast ───────────────────────────────────────────────────────────────────
export const toastVariants = {
  initial:  { opacity: 0, x: 60,  y: -8 },
  animate:  { opacity: 1, x: 0,   y: 0,  transition: { duration: DURATION.normal, ease: EASE.bouncy } },
  exit:     { opacity: 0, x: 60,         transition: { duration: DURATION.fast                      } },
}

// ─── Progress bar ────────────────────────────────────────────────────────────
export function progressBar(pct) {
  return {
    initial:  { width: '0%'    },
    animate:  { width: `${pct}%`, transition: { duration: DURATION.slow, ease: EASE.easeOut } },
  }
}

// ─── Checkmark draw ──────────────────────────────────────────────────────────
export const checkmarkVariants = {
  initial:  { pathLength: 0, opacity: 0 },
  animate:  { pathLength: 1, opacity: 1, transition: { duration: 0.4, ease: EASE.easeOut } },
}

// ─── Number count-up hook (plain JS, works with react-countup) ───────────────
export function countUpConfig(end) {
  return {
    start:    0,
    end,
    duration: 1.2,
    separator: ',',
    useEasing: true,
  }
}
