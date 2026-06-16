import { motion } from "framer-motion";

export default function HeroMarquee({ images, direction = "up", duration = 20 }) {
    const sequence = direction === "up" ? ["0%", "-50%"] : ["-50%", "0%"];

    return (
        <div className="overflow-hidden marquee-mask relative h-full">
            <motion.div
                className="flex flex-col gap-4"
                animate={{ y: sequence }}
                transition={{
                    duration,
                    ease: "linear",
                    repeat: Infinity,
                }}
            >
                {[...images, ...images].map((src, i) => (
                    <div
                        key={i}
                        className="aspect-[4/3] shrink-0 overflow-hidden rounded-xl bg-gray-100"
                    >
                        <img
                            src={src}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                        />
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
