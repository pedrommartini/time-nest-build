
import { motion } from 'framer-motion';

export const AnimatedTimeline = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        {/* Central Timeline Line */}
        <motion.line 
          x1="50" y1="10" x2="50" y2="90" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
          className="text-brand-300 dark:text-brand-700"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeInOut", delay: 0.8 }}
        />
        
        {/* Event Block 1 (Morning) */}
        <motion.rect
          x="15" y="20" width="30" height="15" rx="4"
          className="fill-brand-500 dark:fill-brand-400"
          initial={{ x: -20, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 1.3, type: "spring", stiffness: 200, damping: 12 }}
        />
        
        {/* Node 1 */}
        <motion.circle
          cx="50" cy="27.5" r="4"
          className="fill-brand-600 dark:fill-brand-300"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.6, type: "spring" }}
        />

        {/* Event Block 2 (Focus Task) */}
        <motion.rect
          x="55" y="45" width="30" height="20" rx="4"
          className="fill-yellow-500"
          initial={{ x: 20, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 1.7, type: "spring", stiffness: 200, damping: 12 }}
        />

        {/* Node 2 */}
        <motion.circle
          cx="50" cy="55" r="4"
          className="fill-yellow-600 dark:fill-yellow-400"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 2.0, type: "spring" }}
        />

        {/* Event Block 3 (Evening) */}
        <motion.rect
          x="20" y="75" width="25" height="10" rx="4"
          className="fill-brand-400 dark:fill-brand-600"
          initial={{ x: -20, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 2.1, type: "spring", stiffness: 200, damping: 12 }}
        />
        
        {/* Node 3 */}
        <motion.circle
          cx="50" cy="80" r="4"
          className="fill-brand-500 dark:fill-brand-400"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 2.4, type: "spring" }}
        />
      </svg>
    </div>
  );
};

export const AnimatedSync = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        {/* Background spinning circle */}
        <motion.circle
          cx="50" cy="50" r="35"
          className="stroke-blue-200 dark:stroke-blue-900/50 fill-transparent"
          strokeWidth="2"
          strokeDasharray="10 5"
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          style={{ originX: "50px", originY: "50px" }}
        />

        {/* Sync Arrows */}
        <motion.path
          d="M 30 50 A 20 20 0 0 1 70 50"
          className="stroke-blue-500 fill-transparent"
          strokeWidth="3" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.8 }}
        />
        <motion.path
          d="M 70 50 A 20 20 0 0 1 30 50"
          className="stroke-green-500 fill-transparent"
          strokeWidth="3" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1.55 }}
        />

        {/* Center Calendar Icon */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 10, delay: 1.1 }}
        >
          <rect x="38" y="38" width="24" height="24" rx="4" className="fill-white dark:fill-gray-800 stroke-blue-600 dark:stroke-blue-400" strokeWidth="2" />
          <line x1="38" y1="46" x2="62" y2="46" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="2" />
          <line x1="43" y1="35" x2="43" y2="41" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="2" strokeLinecap="round" />
          <line x1="57" y1="35" x2="57" y2="41" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="2" strokeLinecap="round" />
          
          {/* Google colored dots */}
          <circle cx="44" cy="52" r="1.5" fill="#4285F4" />
          <circle cx="50" cy="52" r="1.5" fill="#EA4335" />
          <circle cx="56" cy="52" r="1.5" fill="#FBBC05" />
          <circle cx="44" cy="58" r="1.5" fill="#34A853" />
        </motion.g>

        {/* Orbiting particles */}
        <motion.circle
          cx="15" cy="50" r="3" fill="#4285F4"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{ originX: "50px", originY: "50px" }}
        />
        <motion.circle
          cx="85" cy="50" r="3" fill="#EA4335"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 1 }}
          style={{ originX: "50px", originY: "50px" }}
        />
      </svg>
    </div>
  );
};

export const AnimatedSleep = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        {/* Stars */}
        {[
          { x: 20, y: 30, r: 1.5, delay: 0 },
          { x: 80, y: 20, r: 2, delay: 0.5 },
          { x: 70, y: 70, r: 1, delay: 1 },
          { x: 30, y: 75, r: 1.5, delay: 1.5 },
          { x: 50, y: 15, r: 1, delay: 0.8 },
        ].map((star, i) => (
          <motion.circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.r}
            className="fill-indigo-300 dark:fill-indigo-500"
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: star.delay }}
          />
        ))}

        {/* Rocking Moon */}
        <motion.g
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "50px", originY: "50px" }}
        >
          <path
            d="M 60 25 A 25 25 0 1 0 75 70 A 30 30 0 1 1 60 25 Z"
            className="fill-indigo-500 dark:fill-indigo-400"
          />
        </motion.g>

        {/* Floating Zzz */}
        <motion.text
          x="65" y="45"
          className="fill-indigo-400 dark:fill-indigo-300 font-bold text-[8px]"
          initial={{ opacity: 0, y: 45, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], y: 25, scale: 1 }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.8 }}
        >Z</motion.text>
        <motion.text
          x="75" y="35"
          className="fill-indigo-300 dark:fill-indigo-400 font-bold text-[12px]"
          initial={{ opacity: 0, y: 35, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], y: 10, scale: 1 }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.8 }}
        >Z</motion.text>
      </svg>
    </div>
  );
};
