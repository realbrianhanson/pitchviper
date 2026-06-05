import { motion } from "framer-motion";

const quotes = [
  { text: "Every 'no' brings you closer to a 'yes'.", author: "Mark Cuban" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Don't find customers for your products, find products for your customers.", author: "Seth Godin" },
  { text: "Sales is not about selling anymore, but about building trust and educating.", author: "Siva Devaki" },
  { text: "Make a customer, not a sale.", author: "Katherine Barchetti" },
  { text: "The most unprofitable item ever manufactured is an excuse.", author: "John Mason" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Quality performance starts with a positive attitude.", author: "Jeffrey Gitomer" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
];

export function MotivationalQuote() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const quote = quotes[dayOfYear % quotes.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bento-tile min-h-[140px] flex flex-col justify-center"
    >
      <div className="flex gap-5 items-start">
        <span className="font-display text-5xl leading-none italic text-primary -mt-2">"</span>
        <div className="flex-1">
          <p className="font-display italic text-xl md:text-2xl leading-snug text-foreground/90 mb-4">
            {quote.text}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 font-bold">
            — {quote.author}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
