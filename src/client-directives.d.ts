// Types for custom client directives registered in astro.config.mjs.
import 'astro';

declare module 'astro' {
  interface AstroClientDirectives {
    // See src/directives/interaction.js
    'client:interaction'?: boolean | number;
  }
}
