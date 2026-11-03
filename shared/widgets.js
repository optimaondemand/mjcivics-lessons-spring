/* Shared widget runtime: one delegated listener for all ten engines.
   Reset restores each widget to the markup it had at page load. */
(function () {
  var snap = new WeakMap();
  function qa(el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); }
  function snapshot() {
    qa(document, '.optima-widget').forEach(function (w) { if (!snap.has(w)) snap.set(w, w.innerHTML); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', snapshot); else snapshot();

  function say(w, text, kind) {
    var fb = w.querySelector('.widget-feedback');
    if (!fb) return;
    fb.textContent = text || '';
    fb.className = 'widget-feedback show' + (kind ? ' ' + kind : '');
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;
    var w = t.closest('.optima-widget');
    if (!w) return;
    var eng = w.getAttribute('data-engine');

    if (t.closest('.widget-reset')) {
      if (snap.has(w)) { w.innerHTML = snap.get(w); }
      delete w.dataset.next; delete w.dataset.cur; delete w.dataset.picked;
      return;
    }

    if (eng === 'reflect') {
      var rb = t.closest('.widget-options button');
      if (!rb) return;
      qa(w, '.widget-options button').forEach(function (b) { b.classList.remove('selected'); });
      rb.classList.add('selected');
      say(w, rb.getAttribute('data-response') || '');
      return;
    }

    if (eng === 'sel' || eng === 'scale') {
      var sb = t.closest('.widget-row .widget-options button');
      if (!sb) return;
      var row = sb.closest('.widget-row');
      var correct = row.getAttribute('data-correct');
      qa(row, '.widget-options button').forEach(function (b) { b.classList.remove('selected', 'correct', 'incorrect'); });
      var rf = row.querySelector('.row-feedback') || row.appendChild(document.createElement('div'));
      if (correct === null || correct === '') {
        sb.classList.add('selected');
        rf.className = 'row-feedback note';
        rf.textContent = sb.getAttribute('data-fb') || '';
        return;
      }
      var ok = correct.split(',').indexOf(sb.getAttribute('data-choice')) >= 0;
      sb.classList.add(ok ? 'correct' : 'incorrect');
      rf.className = 'row-feedback ' + (ok ? 'correct' : 'incorrect');
      rf.textContent = ok ? (sb.getAttribute('data-fb') || row.getAttribute('data-fb') || 'Right.')
                          : (sb.getAttribute('data-fb') || row.getAttribute('data-hint') || 'Not quite. Try again.');
      return;
    }

    if (eng === 'flip') {
      var card = t.closest('.ow-card');
      if (card) card.classList.toggle('flipped');
      return;
    }

    if (eng === 'reveal') {
      var sh = t.closest('.ow-show');
      if (!sh) return;
      var ans = w.querySelector('.ow-answer');
      ans.hidden = false;
      sh.disabled = true;
      return;
    }

    if (eng === 'order') {
      var it = t.closest('.ow-item');
      if (!it || it.classList.contains('placed')) return;
      var next = +(w.dataset.next || 0);
      var slots = qa(w, '.ow-slot');
      if (+it.getAttribute('data-i') === next) {
        slots[next].textContent = it.textContent;
        slots[next].classList.add('filled');
        it.classList.add('placed');
        it.hidden = true;
        w.dataset.next = String(next + 1);
        var note = it.getAttribute('data-note') || '';
        if (next + 1 >= slots.length) say(w, 'That is the whole sequence. ' + note, 'good');
        else say(w, note, 'good');
      } else {
        it.classList.add('shake');
        setTimeout(function () { it.classList.remove('shake'); }, 600);
        say(w, it.getAttribute('data-hint') || 'Not yet. Look at the clues in each choice and ask which of these came first.', 'nudge');
      }
      return;
    }

    if (eng === 'sort') {
      var si = t.closest('.ow-item');
      if (si && !si.hidden) {
        var was = si.classList.contains('selected');
        qa(w, '.ow-item').forEach(function (b) { b.classList.remove('selected'); });
        if (!was) si.classList.add('selected');
        w.dataset.picked = was ? '' : '1';
        return;
      }
      var bin = t.closest('.ow-bin');
      var cur = w.querySelector('.ow-item.selected');
      if (bin && cur) {
        if (cur.getAttribute('data-bin') === bin.getAttribute('data-bin')) {
          var li = document.createElement('li');
          li.textContent = cur.textContent;
          bin.querySelector('ul').appendChild(li);
          cur.hidden = true;
          cur.classList.remove('selected');
          cur.classList.add('placed');
          var left = qa(w, '.ow-item').filter(function (b) { return !b.hidden; }).length;
          say(w, (cur.getAttribute('data-why') || 'Right.') + (left === 0 ? ' Everything is sorted.' : ''), 'good');
        } else {
          cur.classList.remove('selected');
          cur.classList.add('shake');
          setTimeout(function () { cur.classList.remove('shake'); }, 600);
          say(w, cur.getAttribute('data-hint') || 'Not that one. Think about what this item is, then try another box.', 'nudge');
        }
      } else if (bin && !cur) {
        say(w, 'Tap one of the items first, then tap the box where it belongs.', '');
      }
      return;
    }

    if (eng === 'step') {
      var frames = qa(w, '.ow-frame');
      var idx = +(w.dataset.cur || 0);
      var dir = t.closest('.ow-next') ? 1 : (t.closest('.ow-prev') ? -1 : 0);
      if (!dir) return;
      idx = Math.max(0, Math.min(frames.length - 1, idx + dir));
      w.dataset.cur = String(idx);
      frames.forEach(function (f, i) { f.classList.toggle('on', i === idx); });
      qa(w, '.ow-dot').forEach(function (d, i) { d.classList.toggle('on', i <= idx); });
      w.querySelector('.ow-step-count').textContent = 'Step ' + (idx + 1) + ' of ' + frames.length;
      w.querySelector('.ow-prev').disabled = idx === 0;
      w.querySelector('.ow-next').disabled = idx === frames.length - 1;
      return;
    }

    if (eng === 'decide') {
      var ch = t.closest('.ow-choice');
      if (!ch) return;
      var ci = ch.getAttribute('data-i');
      qa(w, '.ow-choice').forEach(function (b) { b.classList.remove('selected'); });
      ch.classList.add('selected');
      qa(w, '.ow-result').forEach(function (r) { r.classList.toggle('on', r.getAttribute('data-i') === ci); });
      var act = w.querySelector('.ow-actual');
      if (act) act.classList.add('on');
      return;
    }

    if (eng === 'hot') {
      var p = t.closest('.ow-part');
      if (!p) return;
      var pi = p.getAttribute('data-i');
      qa(w, '.ow-part').forEach(function (b) { b.classList.remove('selected'); });
      p.classList.add('selected', 'seen');
      qa(w, '.ow-info').forEach(function (r) { r.classList.toggle('on', r.getAttribute('data-i') === pi); });
      var all = qa(w, '.ow-part');
      var seen = all.filter(function (b) { return b.classList.contains('seen'); }).length;
      w.querySelector('.ow-count').textContent = 'Looked at ' + seen + ' of ' + all.length;
      return;
    }
  });
})();
