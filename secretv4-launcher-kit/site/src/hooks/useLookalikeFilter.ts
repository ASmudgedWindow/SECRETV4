import { useEffect } from 'react';
import { toLookalike } from '@/lib/lookalike';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT']);

/** True if this text should be left alone (the site title, text you type, etc.). */
function isExcluded(node: Node): boolean {
  let el: Element | null = node instanceof Element ? node : node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName) || el.hasAttribute('data-no-translate')) return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * Swaps the letters of everything on screen for lookalike characters, except anything marked
 * data-no-translate (the title) and text you type yourself. The real text is kept so turning it
 * off puts everything back exactly as it was.
 */
export function useLookalikeFilter(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const textState = new WeakMap<Text, { orig: string; out: string }>();
    const placeholderState = new WeakMap<Element, { orig: string; out: string }>();

    const doText = (node: Text) => {
      const value = node.nodeValue ?? '';
      const prev = textState.get(node);
      if (prev && prev.out === value) return; // already ours
      if (isExcluded(node)) return;
      const out = toLookalike(value);
      if (out === value) {
        textState.delete(node);
        return;
      }
      textState.set(node, { orig: value, out });
      node.nodeValue = out;
    };

    const doPlaceholder = (el: Element) => {
      const value = el.getAttribute('placeholder');
      if (!value) return;
      const prev = placeholderState.get(el);
      if (prev && prev.out === value) return;
      // The input itself is skipped for typed text, but its placeholder is page text
      if (el.hasAttribute('data-no-translate') || (el.parentElement && isExcluded(el.parentElement))) return;
      const out = toLookalike(value);
      if (out === value) return;
      placeholderState.set(el, { orig: value, out });
      el.setAttribute('placeholder', out);
    };

    const scan = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        doText(root as Text);
        return;
      }
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) doText(n as Text);
      const el = root as Element;
      if (el.matches('[placeholder]')) doPlaceholder(el);
      el.querySelectorAll('[placeholder]').forEach(doPlaceholder);
    };

    scan(document.body);

    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'childList') r.addedNodes.forEach(scan);
        else if (r.type === 'characterData') doText(r.target as Text);
        else if (r.type === 'attributes') doPlaceholder(r.target as Element);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder'],
    });

    return () => {
      observer.disconnect();
      // Put the real text back
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const node = n as Text;
        const state = textState.get(node);
        if (state && node.nodeValue === state.out) node.nodeValue = state.orig;
      }
      document.body.querySelectorAll('[placeholder]').forEach((el) => {
        const state = placeholderState.get(el);
        if (state && el.getAttribute('placeholder') === state.out) el.setAttribute('placeholder', state.orig);
      });
    };
  }, [enabled]);
}
