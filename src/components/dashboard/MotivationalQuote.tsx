import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { Quote } from "lucide-react";
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
  // Get quote based on day of year for consistency
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const quote = quotes[dayOfYear % quotes.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.5 }}
    >
      <ViperCard variant="default" className="bg-gradient-to-r from-card to-card/50">
        <ViperCardContent className="py-4">
          <div className="flex items-start gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
            >
              <Quote className="h-8 w-8 text-primary/30 shrink-0 mt-1" />
            </motion.div>
            <div>
              <motion.p
                className="text-foreground font-medium italic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                "{quote.text}"
              </motion.p>
              <motion.p
                className="text-sm text-muted-foreground mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                — {quote.author}
              </motion.p>
            </div>
          </div>
        </ViperCardContent>
      </ViperCard>
    </motion.div>
  );
}