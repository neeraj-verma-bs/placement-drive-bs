const DEVELOPER_GITHUB_ID = "neeraj-verma-bs";

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      Developed by{" "}
      <a
        href={`https://github.com/${DEVELOPER_GITHUB_ID}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-zinc-100"
      >
        {DEVELOPER_GITHUB_ID}
      </a>
    </footer>
  );
}
