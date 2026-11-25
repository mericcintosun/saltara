export default function Loading() {
  return (
    <div className="mx-auto max-w-prose px-5 pt-12">
      <p role="status" className="saltara-wipe flex items-center gap-3 rounded-3xl bg-card p-6 text-lg">
        <span aria-hidden className="size-3 shrink-0 rounded-full bg-sun" />
        Loading the 9B lesson
      </p>
    </div>
  );
}
