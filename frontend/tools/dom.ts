import { JSDOM } from 'jsdom'
export const dom = new JSDOM('<!doctype html><html><body><div id="raiz"></div></body></html>',
  { url: 'http://localhost:5173/erp/contabilidad' })
const g = globalThis as any
g.window = dom.window; g.document = dom.window.document
g.navigator = dom.window.navigator; g.HTMLElement = dom.window.HTMLElement
g.Element = dom.window.Element; g.Node = dom.window.Node
g.SVGElement = dom.window.SVGElement; g.getComputedStyle = dom.window.getComputedStyle
g.requestAnimationFrame = (cb: any) => setTimeout(cb, 0)
g.cancelAnimationFrame = clearTimeout
g.matchMedia = () => ({ matches: false, media: '', onchange: null, addListener() {},
  removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })
g.window.matchMedia = g.matchMedia
g.localStorage = dom.window.localStorage
g.IS_REACT_ACT_ENVIRONMENT = true
