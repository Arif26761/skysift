import { Workbench } from "@/components/weather/workbench";

/**
 * The application.
 *
 * A server component whose only job is to mount the client workbench. Keeping
 * the page itself on the server means the shell, fonts and metadata are all
 * statically rendered, and only the interactive surface ships as JavaScript.
 */
export default function Home() {
  return <Workbench />;
}
