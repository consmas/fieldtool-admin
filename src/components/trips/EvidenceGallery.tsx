import type { EvidenceItem } from "@/types/api";

export default function EvidenceGallery({
  evidence,
  title = "Evidence Gallery",
}: {
  evidence?: EvidenceItem[];
  title?: string;
}) {
  const items = evidence ?? [];

  return (
    <div className="ops-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
        <span className="text-xs text-muted-foreground">{items.length} items</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No evidence uploaded yet.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id ?? index}
              className="aspect-video overflow-hidden rounded-xl border border-border bg-muted"
            >
              {item.photo_url ? (
                <img
                  src={item.photo_url}
                  alt={`Evidence ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
