// spaceapps-harness — OpenCode V2 server plugin.
// V2 requires a default export with an id and a setup() function; tool hooks are
// registered through ctx.tool.hook (not the V1 "tool.execute.before" hook map),
// and bash arguments arrive as event.input (not output.args).
export default {
  id: "spaceapps-harness",
  async setup(ctx) {
    await ctx.tool.hook("execute.before", (event) => {
      if (event.tool !== "bash") return;
      const nasaKey = process.env.NASA_API_KEY;
      if (!nasaKey || event.input.command.includes("api_key=")) return;

      event.input.command = event.input.command.replace(
        /https?:\/\/api\.nasa\.gov[^\s'"`]*/gi,
        (raw) => {
          const url = new URL(raw);
          if (!url.searchParams.has("api_key")) url.searchParams.set("api_key", nasaKey);
          return url.toString();
        }
      );
    });
  },
};
