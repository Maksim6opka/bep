export default function Home() {
  return (
    <div className="relative flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">bep</h1>
        <p className="text-lg font-normal leading-7 tracking-tight text-black dark:text-zinc-50">maksim6opka</p>
        <p className="text-lg font-normal leading-7 tracking-tight text-black dark:text-zinc-50">maksym</p>
        <a
          href="https://github.com/maksim6opka"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub profile"
          className="absolute bottom-8 text-black transition-transform hover:scale-110 dark:text-zinc-50"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-8 fill-current">
            <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.74-1.55-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.16 1.18a10.95 10.95 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.41-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.27c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
          </svg>
        </a>
    </div>
  );
}
