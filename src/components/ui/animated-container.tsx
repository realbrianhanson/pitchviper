import { motion, Variants, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

// Stagger children animation
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

// Fade up animation
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
};

// Scale in animation
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
};

// Slide in from left
const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

// Slide in from right
const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

interface AnimatedContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  variant?: "stagger" | "fadeUp" | "scaleIn" | "slideLeft" | "slideRight";
  delay?: number;
}

export const AnimatedContainer = forwardRef<HTMLDivElement, AnimatedContainerProps>(
  ({ children, className, variant = "fadeUp", delay = 0, ...props }, ref) => {
    const variants = {
      stagger: staggerContainer,
      fadeUp,
      scaleIn,
      slideLeft: slideInLeft,
      slideRight: slideInRight,
    };

    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={variants[variant]}
        transition={{ delay }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedContainer.displayName = "AnimatedContainer";

interface AnimatedItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedItem = forwardRef<HTMLDivElement, AnimatedItemProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={staggerItem}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedItem.displayName = "AnimatedItem";

// Animated number with spring physics
interface AnimatedNumberProps {
  value: number;
  className?: string;
  format?: "number" | "currency" | "percentage";
  duration?: number;
}

export function AnimatedNumber({ 
  value, 
  className, 
  format = "number",
  duration = 1.5 
}: AnimatedNumberProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case "currency":
        if (val >= 1000000) return "$" + (val / 1000000).toFixed(1) + "M";
        if (val >= 1000) return "$" + (val / 1000).toFixed(1) + "K";
        return "$" + val.toLocaleString();
      case "percentage":
        return val + "%";
      default:
        if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
        if (val >= 1000) return (val / 1000).toFixed(1) + "K";
        return val.toLocaleString();
    }
  };

  return (
    <motion.span
      className={cn("tabular-nums", className)}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
    >
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {formatValue(value)}
      </motion.span>
    </motion.span>
  );
}

// Animated progress bar
interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  delay?: number;
}

export function AnimatedProgress({ 
  value, 
  max = 100, 
  className, 
  barClassName,
  delay = 0 
}: AnimatedProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("h-2 bg-muted rounded-full overflow-hidden", className)}>
      <motion.div
        className={cn("h-full bg-gradient-to-r from-primary to-success rounded-full", barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 15,
          delay,
        }}
      />
    </div>
  );
}

// Hover card wrapper with lift effect
interface HoverCardWrapperProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

export function HoverCardWrapper({ children, className, ...props }: HoverCardWrapperProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ 
        y: -4, 
        transition: { type: "spring", stiffness: 400, damping: 25 } 
      }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Pulse animation wrapper
interface PulseWrapperProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}

export function PulseWrapper({ children, className, active = true, ...props }: PulseWrapperProps) {
  return (
    <motion.div
      className={className}
      animate={active ? {
        scale: [1, 1.02, 1],
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse",
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export { staggerContainer, staggerItem, fadeUp, scaleIn, slideInLeft, slideInRight };
