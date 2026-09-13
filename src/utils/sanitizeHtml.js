import DOMPurify from "dompurify";

/* One place to turn a string of HTML into something safe to inject.

   The site renders HTML from several sources it does not control — third-party
   RSS article bodies, match commentary from an external sports API, and blog
   posts written by a model — straight into dangerouslySetInnerHTML. Any one of
   those can carry a <script>, an onerror= on a broken <img>, or a
   javascript: href, and it runs on our origin with the viewer's session.

   Two profiles, because the site injects two very different kinds of HTML:

   - sanitizeArticle: prose. Formatting, links and images survive; script,
     style, iframe, form, event handlers and javascript: URLs do not.
   - sanitizeEmbed: a player embed, which genuinely needs an <iframe>. Still
     no inline event handlers and no <script>, so a stored embed cannot run
     arbitrary code on our page — it can only frame another document.

   Neither is a licence to inject anything at all: sanitizeEmbed is for
   admin-authored players only, and is the narrower of two bad options against
   removing the feature. */

const ARTICLE = {
  ALLOWED_TAGS: [
    "p", "br", "hr", "span", "div", "section", "article",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "small", "sub", "sup", "mark",
    "ul", "ol", "li", "dl", "dt", "dd",
    "blockquote", "pre", "code",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  ],
  ALLOWED_ATTR: ["href", "title", "alt", "src", "srcset", "width", "height", "colspan", "rowspan", "class", "loading"],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|\/|#|data:image\/(?:png|jpe?g|gif|webp|avif);base64,)/i,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "link", "meta", "base"],
  // DOMPurify strips on* handlers by default; naming them is belt and braces.
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "srcdoc", "formaction", "style"],
};

const EMBED = {
  ALLOWED_TAGS: ["iframe", "div", "span", "p", "br", "video", "source", "a", "img"],
  ALLOWED_ATTR: [
    "src", "width", "height", "frameborder", "allow", "allowfullscreen",
    "scrolling", "referrerpolicy", "sandbox", "class", "style",
    "controls", "autoplay", "muted", "playsinline", "poster", "type", "href", "alt",
  ],
  ALLOWED_URI_REGEXP: /^(?:https?:|\/\/|\/)/i,
  FORBID_TAGS: ["script", "object", "embed", "form", "input", "link", "meta", "base"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "srcdoc", "formaction"],
};

/* Links out of injected prose open in a new tab without handing the opener a
   window reference — target=_blank without noopener lets the opened page
   navigate ours via window.opener. */
let hookInstalled = false;
function installHook() {
  if (hookInstalled || typeof window === "undefined") return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
  hookInstalled = true;
}

export function sanitizeArticle(html) {
  if (!html) return "";
  installHook();
  return DOMPurify.sanitize(String(html), ARTICLE);
}

export function sanitizeEmbed(html) {
  if (!html) return "";
  return DOMPurify.sanitize(String(html), EMBED);
}
