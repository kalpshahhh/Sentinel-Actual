import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  compensationDeg: number;
  compensationY: number;
  simulatedRoughSeas: boolean;
  gyroActive: boolean;
  className?: string;
};

/**
 * Operational content layer. Applies inverse rotation + small Y translate
 * from the smoothed gyro stream so the UI stays "level" while the vessel pitches.
 *
 * When NO motion is active (desktop Chrome with no sensors, rough-seas off),
 * we render a plain div with no transform — this avoids creating a containing
 * block, which breaks `position: sticky` and `position: fixed` descendants
 * in Chromium.
 */
export function StabilizedContainer({
  children,
  compensationDeg,
  compensationY,
  simulatedRoughSeas,
  gyroActive,
  className,
}: Props) {
  const needsGyro = gyroActive && (Math.abs(compensationDeg) > 0.1 || Math.abs(compensationY) > 0.1);

  if (!needsGyro && !simulatedRoughSeas) {
    // Fast path: no transform context, layout behaves normally.
    return <div className={clsx('w-full', className)}>{children}</div>;
  }

  if (simulatedRoughSeas && !needsGyro) {
    // CSS animation only — no Framer.
    return <div className={clsx('w-full rough-seas', className)}>{children}</div>;
  }

  return (
    <motion.div
      animate={{ rotate: compensationDeg, y: compensationY }}
      transition={{ type: 'spring', stiffness: 90, damping: 18, mass: 0.6 }}
      style={{ transformOrigin: '50% 50%', willChange: 'transform' }}
      className={clsx('w-full', className)}
    >
      {children}
    </motion.div>
  );
}
