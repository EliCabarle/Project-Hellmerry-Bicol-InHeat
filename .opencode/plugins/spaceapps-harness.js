import type { Plugin } from "@opencode-ai/plugin"

export default (async ({ client, project, directory, $ }) => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash" && /nasa.*data|earthdata|api\.nasa\.gov/i.test(output.args.command)) {
        const nasaKey = process.env.NASA_API_KEY
        if (nasaKey && !output.args.command.includes("api_key=")) {
          output.args.command = output.args.command.replace(
            "api.nasa.gov",
            `api.nasa.gov?api_key=${nasaKey}`
          )
        }
      }
    }
  }
}) satisfies Plugin