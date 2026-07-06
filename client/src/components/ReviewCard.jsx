import StarRating from "./StarRating";

function timeAgo(date) {
    if (!date) return "";
    const now = new Date();
    const d = date?.toDate ? date.toDate() : new Date(date?._seconds ? date._seconds * 1000 : date);
    if (isNaN(d.getTime())) return "";
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ReviewCard({ review }) {
    return (
        <div className="rounded-xl border border-primary/10 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-accent">
                        {review.reviewerName?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                    <span className="truncate text-sm font-semibold text-dark">{review.reviewerName}</span>
                </div>
                <span className="shrink-0 text-xs text-gray">{timeAgo(review.createdAt)}</span>
            </div>
            <div className="mt-2">
                <StarRating rating={review.rating} size="sm" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray">{review.comment}</p>
        </div>
    );
}
