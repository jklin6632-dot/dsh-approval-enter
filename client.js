/**
 * dsh-approval-enter — press Enter to approve a pending approval request.
 *
 * The approval card already answers Enter, but only while the keyboard focus is
 * inside the card. Normally the focus stays in the composer, so the user has to
 * click the button. This module listens for Enter at the window level and, when
 * an approval card is pending, forwards a real Enter keydown to the card body —
 * the card then runs its own `onAllow` path (single-use grant), so the decision
 * semantics stay exactly the built-in ones.
 *
 * Enter is left alone while the user is typing a non-empty message, and while an
 * IME is composing, so sending a message and Chinese input keep working.
 */
window.__ModuleLoader__.load({
  id: 'dsh-approval-enter',
  factory() {
    const PANEL = '[data-approval-key]'
    const PANEL_BODY = '[data-approval-scroll]'

    function visiblePendingPanel() {
      const panels = document.querySelectorAll(PANEL)
      for (const panel of panels) {
        if (panel.getAttribute('aria-busy') === 'true') continue
        const rect = panel.getBoundingClientRect()
        if (rect.width < 2 || rect.height < 2) continue
        return panel
      }
      return null
    }

    /** Distinguish "typing a message" from "focus happens to sit in the box". */
    function typingState(active) {
      if (!active || typeof active.closest !== 'function') return { typing: false, empty: true }
      const field = active.closest(
        'input, textarea, [contenteditable="true"], [contenteditable=""], [role="textbox"]',
      )
      if (field === null) return { typing: false, empty: true }
      let text = ''
      if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') text = field.value || ''
      else text = field.textContent || ''
      return { typing: true, empty: String(text).trim() === '' }
    }

    function focusPanelBody(panel) {
      const body = panel.querySelector(PANEL_BODY)
      if (body === null) return null
      if (document.activeElement === body) return body
      try {
        body.focus({ preventScroll: true })
      } catch {
        body.focus()
      }
      return body
    }

    function forwardEnter(target) {
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
      target.dispatchEvent(event)
    }

    function approveWithClick(panel) {
      const buttons = panel.querySelectorAll('button')
      // Action order is reject, allow-once, allow-always.
      if (buttons.length >= 2 && !buttons[1].disabled) {
        buttons[1].click()
        return true
      }
      return false
    }

    return {
      apply(ctx) {
        // The forwarded keydown bubbles back to this same window listener; the
        // flag keeps it from re-entering and forwarding itself forever.
        let forwarding = false

        const onKeyDown = (event) => {
          if (forwarding) return
          if (event.defaultPrevented) return
          if (event.key !== 'Enter') return
          if (event.isComposing || event.keyCode === 229) return
          if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return

          const panel = visiblePendingPanel()
          if (panel === null) return

          const target = event.target
          if (
            target instanceof Element &&
            target.closest('button, a[href], [role="button"], [role="menuitem"]') !== null
          ) {
            // Let a focused control handle its own Enter.
            return
          }

          const state = typingState(document.activeElement)
          if (state.typing && !state.empty) return

          event.preventDefault()
          event.stopPropagation()

          const body = focusPanelBody(panel)
          forwarding = true
          try {
            forwardEnter(body || panel)
          } finally {
            forwarding = false
          }

          // Safety net: if the card did not react, click allow-once ourselves.
          setTimeout(() => {
            const still = document.querySelector(PANEL + ':not([aria-busy="true"])')
            if (still !== null && still === panel) approveWithClick(panel)
          }, 60)
        }

        ctx.effect(() => {
          window.addEventListener('keydown', onKeyDown, true)
          return () => window.removeEventListener('keydown', onKeyDown, true)
        }, 'dsh-approval-enter: keydown')
      },
    }
  },
})
