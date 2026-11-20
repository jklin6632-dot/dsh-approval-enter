# dsh-approval-enter

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Press **Enter** to approve a pending approval request in [DeepSeek Harness](https://github.com/deepseek-ai) (DSH) — no mouse click needed, and typing a message still sends it.

> 中文摘要：授权卡片弹出时，**直接按回车**就等于点了「允许一次」；输入框里正在打字时回车仍然是发送消息。

## Why this plugin exists

The DSH approval card already answers Enter — **but only while the keyboard focus is inside the card**. After you send a message the focus stays in the composer, so Enter just goes to the input box. The result looks like "Enter does nothing, I have to click".

This plugin listens for Enter at the **window** level. When a pending approval card is visible, it moves the focus into the card and forwards a real Enter keydown, so the card runs its own *allow once* path. The decision semantics stay exactly the built-in ones — the plugin never grants anything the card would not grant itself.

## Behaviour

| situation | what happens |
|---|---|
| no approval pending | Enter is untouched — normal behaviour |
| approval pending + you are typing a non-empty message | Enter **sends the message** (no accidental approval) |
| approval pending + input box empty or not focused | Enter **approves** (allow once) |
| IME composing (e.g. Chinese input) | Enter is ignored by the plugin (`isComposing` / keyCode 229) |
| focus is on a button / link / menu item | left alone — that control handles its own Enter |
| you want "allow always" | still needs a click, by design |

Esc (deny) is left entirely to the card.

## Install

### A. Plugin manager (recommended)

1. Copy this folder somewhere permanent, e.g. `D:\plugins\dsh-approval-enter`.
2. In DSH: **插件 → 安装本地插件**, pick that folder.
3. **Reload the page** (or restart DSH) — this one is a client-side module, so a refresh is enough.

### B. Manual

Add `dsh-approval-enter` to `dsh.profile.bundles` in `%USERPROFILE%\.dsh\profiles\desktop\package.json`, junction it into `node_modules`, restart DSH.

## How it works

`index.js` is an intentionally empty host half; everything happens in [`client.js`](client.js), a client-side module loaded by the DSH module loader:

1. `keydown` listener in the **capture** phase on `window`.
2. Bail out on: modifier keys, `isComposing`, `defaultPrevented`, or a focused interactive element.
3. Look for a visible approval panel: `[data-approval-key]` that is not `aria-busy="true"` and has a non-zero box.
4. If the user is typing a non-empty message, bail out (so Enter still sends).
5. Otherwise `preventDefault()` + `stopPropagation()`, move focus into `[data-approval-scroll]`, and dispatch a synthetic Enter.
6. Safety net: 60 ms later, if the same panel is still pending, click the card's second button (action order: reject, **allow once**, allow always) directly.
7. A `forwarding` flag prevents the forwarded event from re-entering the listener.

## Limitations

- **Depends on DSH's DOM**: the panel is found via `[data-approval-key]` / `[data-approval-scroll]`, and the fallback click assumes the button order *reject, allow once, allow always*. A DSH redesign can break it — open an issue if the selectors change.
- Only "allow once" is wired to Enter; that is deliberate, a bulk "allow always" bound to a stray Enter is how accidents happen.
- Client modules load on page load: after editing the code, refresh the page.

## License

MIT — see [LICENSE](LICENSE).
