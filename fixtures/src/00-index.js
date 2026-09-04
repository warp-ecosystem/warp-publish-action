import { hello } from "./01-hello-world.js";

/**
 * Get the Warp extension's block metadata and definition.
 *
 * @returns {object} Block metadata object with id, name, icon, and blocks
 */
export function getInfo() {
  return {
    id: Warp.meta.id,
    name: Warp.meta.name,
    blockIconURI: Warp.assets["hello-icon.svg"],
    blocks: [
      {
        opcode: "hello",
        blockType: Scratch.BlockType.REPORTER,
        text: "Hello!",
      },
    ],
  };
}
