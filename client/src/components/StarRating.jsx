export default function StarRating({ rating, max = 5, onRate, size = "md" }) {
    const sizes = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };
    return (
        <span className={`inline-flex gap-0.5 ${sizes[size] || sizes.md}`}>
            {Array.from({ length: max }, (_, i) => {
                const filled = i < rating;
                return (
                    <button
                        key={i}
                        type="button"
                        disabled={!onRate}
                        onClick={() => onRate?.(i + 1)}
                        className={`transition ${onRate ? "cursor-pointer hover:scale-110" : "cursor-default"} ${filled ? "text-amber-400" : "text-gray-300"}`}
                        aria-label={`${i + 1} star${i + 1 > 1 ? "s" : ""}`}
                    >
                        {filled ? "\u2605" : "\u2606"}
                    </button>
                );
            })}
        </span>
    );
}
