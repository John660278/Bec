  let currentUser = null;
  let allPayments = [];
  let paymentsCache = {};
  let eventsCache = {};
  let financesCache = {};
  let matrixFetched = false;
  let confirmModalResolver = null;

  function showActionConfirmModal({
    type = 'danger',
    title = 'ยืนยันการทำรายการ',
    desc = 'โปรดตรวจสอบรายละเอียดก่อนดำเนินการ',
    items = [],
    warning = '',
    info = '',
    confirmText = 'ยืนยัน',
    confirmBtnClass = 'btn-danger'
  }) {
    return new Promise((resolve) => {
      confirmModalResolver = resolve;
      const modal = document.getElementById('actionConfirmModal');
      if (!modal) {
        const detailsText = items.map(i => `${i.label}: ${i.value}`).join('\n');
        const alertMsg = `${title}\n\n${detailsText}\n\n${warning || info || ''}`;
        resolve(window.confirm(alertMsg));
        return;
      }

      const iconBox = document.getElementById('confirmModalIconBox');
      const titleEl = document.getElementById('confirmModalTitle');
      const descEl = document.getElementById('confirmModalDesc');
      const detailsEl = document.getElementById('confirmModalDetails');
      const noteEl = document.getElementById('confirmModalNote');
      const btnOk = document.getElementById('confirmModalBtnOk');
      const btnCancel = document.getElementById('confirmModalBtnCancel');

      if (iconBox) {
        iconBox.className = `confirm-icon-box ${type}`;
        if (type === 'danger') {
          iconBox.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>`;
        } else {
          iconBox.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>`;
        }
      }

      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = desc;

      if (detailsEl) {
        if (items && items.length > 0) {
          detailsEl.style.display = 'flex';
          detailsEl.innerHTML = items.map(item => `
            <div class="confirm-detail-row">
              <span class="confirm-detail-label">${escapeHtml(item.label)}</span>
              <span class="confirm-detail-value ${item.highlight ? 'highlight' : ''}">${escapeHtml(item.value)}</span>
            </div>
          `).join('');
        } else {
          detailsEl.style.display = 'none';
        }
      }

      if (noteEl) {
        if (warning) {
          noteEl.style.display = 'flex';
          noteEl.className = 'confirm-note-box warning';
          noteEl.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0;margin-top:2px;">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>${warning}</span>`;
        } else if (info) {
          noteEl.style.display = 'flex';
          noteEl.className = 'confirm-note-box info';
          noteEl.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0;margin-top:2px;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>${info}</span>`;
        } else {
          noteEl.style.display = 'none';
        }
      }

      if (btnOk) {
        btnOk.textContent = confirmText;
        btnOk.className = `btn ${confirmBtnClass || 'btn-danger'}`;
      }

      modal.classList.add('open');
      if (btnCancel) btnCancel.focus();
    });
  }

  function resolveActionConfirm(result) {
    const modal = document.getElementById('actionConfirmModal');
    if (modal) modal.classList.remove('open');
    if (typeof confirmModalResolver === 'function') {
      const fn = confirmModalResolver;
      confirmModalResolver = null;
      fn(result);
    }
  }

  function closeActionConfirmModal(e) {
    if (e) e.stopPropagation();
    resolveActionConfirm(false);
  }

  window.resolveActionConfirm = resolveActionConfirm;
  window.closeActionConfirmModal = closeActionConfirmModal;

  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('actionConfirmModal');
    if (modal && modal.classList.contains('open')) {
      if (e.key === 'Escape') {
        resolveActionConfirm(false);
      }
    }
  });

  function normalizeDoc(item, table) {
    if (!item) return item;
    const res = { ...item };
    if (table === 'payments') {
      res.paymentId = res.id;
      res.name = res.student_name || res.name;
      res.email = res.student_email || res.email;
      res.studentId = res.student_id || res.studentId;
      res.paidAmount = res.paid_amount != null ? res.paid_amount : res.paidAmount;
      res.eventTitle = res.event_title || res.eventTitle;
      res.eventId = res.event_id || res.eventId;
      res.slipUrl = res.slip_url || res.slipUrl;
      res.paidAt = res.paid_at || res.paidAt;
    }
    if (table === 'events') {
      res.eventId = res.id;
      res.baseAmount = res.base_amount != null ? res.base_amount : res.baseAmount;
      res.dueDate = res.due_date || res.dueDate;
      res.createdAt = res.created_at || res.createdAt;
    }
    if (table === 'incomes' || table === 'expenses') {
      res.receiptUrl = res.receipt_url || res.receiptUrl;
      res.source = res.title || res.source;
      res.date = res.created_at ? res.created_at.split('T')[0] : (res.date || '');
      res.timestamp = res.created_at || res.timestamp;
    }
    if (table === 'users') {
      res.studentId = res.student_id || res.studentId;
    }
    return res;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function deleteFinanceRecord(type, id) {
    const typeLabel = type === 'incomes' ? 'รายรับ' : 'รายจ่าย';
    let item = financesCache[type + '_' + id];
    if (!item) {
      try {
        const { data: fetchedDoc } = await window.myAppDb.from(type).select('*').eq('id', id).maybeSingle();
        if (fetchedDoc) item = normalizeDoc(fetchedDoc, type);
      } catch (_) {}
    }
    item = item || {};

    const itemTitle = item.title || item.source || `รายการ${typeLabel}`;
    const amountNum = Number(item.amount || 0);
    const amountStr = `฿${amountNum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const itemDate = item.date ? new Date(item.date).toLocaleDateString('th-TH') : '';

    const confirmed = await showActionConfirmModal({
      type: 'danger',
      title: `ยืนยันการลบรายการ${typeLabel}`,
      desc: `คุณต้องการลบรายการ${typeLabel}นี้ออกจากระบบบัญชีสาขาใช่หรือไม่?`,
      items: [
        { label: `ชื่อรายการ`, value: itemTitle, highlight: true },
        { label: 'ประเภท', value: type === 'incomes' ? 'รายรับสาขา' : 'รายจ่ายสาขา' },
        { label: 'จำนวนเงิน', value: amountStr },
        itemDate ? { label: 'วันที่ทำรายการ', value: itemDate } : null
      ].filter(Boolean),
      warning: `ข้อมูลรายการและรูปถ่ายหลักฐานจะถูกลบอย่างถาวร ยอดสรุปเงินสาขาจะถูกคำนวณใหม่ทันที`,
      confirmText: `ยืนยันลบ${typeLabel}`,
      confirmBtnClass: 'btn-danger'
    });

    if (!confirmed) return;
    
    try {
      const { data: tData } = await window.myAppDb.from(type).select('*').eq('id', id).maybeSingle();
      if (tData) {
        const rUrl = tData.receipt_url || tData.receiptUrl;
        if (rUrl && rUrl.includes('supabase.co')) {
          const rawName = rUrl.split('/public/slips/')[1].split('?')[0];
          const fileName = decodeURIComponent(rawName);
          const { error: sErr } = await window.myAppDb.storage.from('slips').remove([fileName]);
          if (sErr) console.warn('Storage receipt remove error:', sErr);
        }
      }

      await window.myAppDb.from(type).delete().eq('id', id);
      showToast(`ลบรายการ${typeLabel} "${itemTitle}" เรียบร้อยแล้ว`);
      loadOverview();
    } catch (e) {
      console.error(e);
      showToast('ลบไม่สำเร็จ');
    }
  }
  
  function getLocalDateStr(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatThaiDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    const targetDate = new Date(y, m - 1, d);
    const todayStr = getLocalDateStr();
    const isToday = dateStr === todayStr;
    
    const formatted = targetDate.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short', 
      year: '2-digit' 
    });
    
    return isToday ? `✓ วันที่เลือก: ${formatted} (วันนี้)` : `✓ วันที่เลือก: ${formatted}`;
  }

  window.updateDateDisplay = function(inputId, displayId) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(displayId);
    if (!input) return;

    // เมื่อจิ้มเลือกวันเสร็จ ให้หลุด focus ทันที เพื่อให้ปฏิทินบน iPad / มือถือ หุบเก็บอัตโนมัติ
    setTimeout(() => {
      try { input.blur(); } catch (_) {}
    }, 80);

    if (!display) return;
    if (!input.value) {
      display.textContent = 'ยังไม่ได้เลือกวันที่';
      display.className = 'date-selected-hint empty';
      return;
    }
    display.textContent = formatThaiDateDisplay(input.value);
    const isToday = input.value === getLocalDateStr();
    display.className = `date-selected-hint ${isToday ? 'is-today' : 'custom'}`;
  };

  window.setTodayDate = function(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.value = getLocalDateStr();
    const map = {
      'expDate': 'expDateDisplay',
      'incDate': 'incDateDisplay',
      'evDueDate': 'evDueDateDisplay'
    };
    if (map[inputId]) window.updateDateDisplay(inputId, map[inputId]);
    setTimeout(() => {
      try { input.blur(); } catch (_) {}
    }, 80);
  };

  function initAllDateInputs() {
    const today = getLocalDateStr();
    ['expDate', 'incDate', 'evDueDate'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.value) {
        el.value = today;
      }
    });
    window.updateDateDisplay('expDate', 'expDateDisplay');
    window.updateDateDisplay('incDate', 'incDateDisplay');
    window.updateDateDisplay('evDueDate', 'evDueDateDisplay');
  }

  // ─── INIT ───
  document.addEventListener('DOMContentLoaded', () => {
    const raw = sessionStorage.getItem('loggedInUser');
    if (!raw) { location.href = 'index.html'; return; }
    currentUser = JSON.parse(raw);

    if (currentUser.role !== 'Admin') {
      location.href = 'student_dashboard.html'; return;
    }

    const initial = (currentUser.name || currentUser.email || 'A')[0].toUpperCase();
    const avEl = document.getElementById('sidebarAvatar');
    if (avEl) avEl.textContent = initial;
    const nameEl = document.getElementById('sidebarName');
    if (nameEl) nameEl.textContent = currentUser.name || 'Admin';
    const emailEl = document.getElementById('sidebarEmail');
    if (emailEl) emailEl.textContent = currentUser.email || '';
    const mobEmailEl = document.getElementById('mobileUserEmail');
    if (mobEmailEl) mobEmailEl.textContent = currentUser.email || currentUser.name || 'Admin';

    initAllDateInputs();

    // Auto-blur date pickers when changed to close popover on iPad / mobile
    document.querySelectorAll('input[type="date"]').forEach(inp => {
      inp.addEventListener('change', () => {
        setTimeout(() => {
          try { inp.blur(); } catch (_) {}
        }, 80);
      });
    });

    if (currentUser && currentUser.email) {
      loadOverview();
    } else {
      sessionStorage.removeItem('loggedInUser');
      location.href = 'index.html';
    }

    window.addEventListener('resize', updateEmptyStateAlignment);
    window.addEventListener('orientationchange', () => setTimeout(updateEmptyStateAlignment, 120));
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => updateEmptyStateAlignment());
      document.querySelectorAll('.table-scroll').forEach(w => ro.observe(w));
    }
  });

  // ─── EMPTY STATE ALIGNMENT (CENTER IN VISIBLE VIEWPORT) ───
  function updateEmptyStateAlignment() {
    requestAnimationFrame(() => {
      document.querySelectorAll('.table-scroll').forEach(wrap => {
        const table = wrap.querySelector('table');
        const emptyEl = wrap.querySelector('.empty-state');
        if (emptyEl) {
          if (table) table.classList.add('is-empty');
          wrap.classList.add('is-empty');
          wrap.scrollLeft = 0;
        } else if (table) {
          table.classList.remove('is-empty');
          wrap.classList.remove('is-empty');
        }
      });
    });
  }

  // ─── NAVIGATION ───
  function switchView(viewId, el) {
    document.querySelectorAll('.view-pane, .view').forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById('view-' + viewId);
    if (targetView) targetView.classList.add('active');

    document.querySelectorAll('.nav-link, .nav-item, .mobile-nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll(`[data-view="${viewId}"]`).forEach(n => n.classList.add('active'));

    if (viewId === 'overview') loadOverview();
    if (viewId === 'events') fetchEventsData();
    if (viewId === 'payments') fetchPaymentsData();
    if (viewId === 'matrix') fetchMatrixData();
    if (viewId === 'finance' || viewId === 'events') initAllDateInputs();

    setTimeout(updateEmptyStateAlignment, 60);
  }

  // ─── TOAST ───
  function showToast(msg, dur = 2800) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), dur);
  }

  // ─── LIGHTBOX MODAL ───
  function openSlipModal(url, title, metaText, approveBtnHtml = '') {
    const m = document.getElementById('slipModal');
    if (!m) return;
    const imgEl = document.getElementById('slipModalImg');
    if (imgEl) {
      imgEl.src = url || '';
      imgEl.alt = title || 'หลักฐานสลิปโอนเงิน';
    }
    const titleEl = document.getElementById('slipModalTitle');
    if (titleEl) titleEl.textContent = title || 'หลักฐานสลิปโอนเงิน';
    const metaEl = document.getElementById('slipModalMeta');
    if (metaEl) metaEl.textContent = metaText || '';
    
    const footer = document.getElementById('slipModalFooter');
    if (footer) {
      footer.innerHTML = `
        ${approveBtnHtml}
        <button class="btn btn-ghost btn-sm" onclick="closeSlipModal()">ปิด</button>
      `;
    }
    m.classList.add('open');
  }

  function viewPaymentSlip(paymentId) {
    const p = paymentsCache[paymentId] 
           || allPayments.find(x => (x.paymentId === paymentId || x.id === paymentId));
    if (!p) {
      showToast('ไม่พบข้อมูลรายการนี้');
      return;
    }
    if (!p.slipUrl) {
      showToast('รายการนี้ไม่มีรูปสลิปแนบมา');
      return;
    }

    const safeTitle = (p.eventTitle || p.eventId || 'รอบการชำระ');
    const safeName = (p.name || 'นิสิต');
    const pId = p.paymentId || p.id || paymentId;
    const escapedTitle = safeTitle.replace(/'/g, "\\'");
    const escapedEmail = (p.email || '').replace(/'/g, "\\'");
    const amountNum = Number(p.paidAmount || 0);

    const approveBtn = p.status === 'Pending'
      ? `<button class="btn btn-primary btn-sm" onclick="approveFromModal('${pId}', '${escapedTitle}', '${escapedEmail}', ${amountNum})">อนุมัติยอดนี้</button>`
      : '';

    openSlipModal(
      p.slipUrl, 
      `${safeName} - ${safeTitle}`, 
      `ยอดชำระ: ฿${amountNum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      approveBtn
    );
  }

  async function approveFromModal(pId, title, email, amount) {
    closeSlipModal();
    await approve(pId, title, email, amount);
  }

  function closeSlipModal(e) {
    const m = document.getElementById('slipModal');
    if (m) m.classList.remove('open');
  }

  // ─── MATRIX (Dynamic Live On-the-fly Calculation) ───
  async function fetchMatrixData() {
    matrixFetched = true;
    const tBody = document.getElementById('matrixBody');
    const tHead = document.getElementById('matrixHeaders');
    if (!tBody || !tHead) return;
    tBody.innerHTML = `<tr><td><div class="skeleton"></div></td></tr>`;

    try {
      const [usersRes, evRes, payRes] = await Promise.all([
        window.myAppDb.from('users').select('*').eq('role', 'Student'),
        window.myAppDb.from('events').select('*'),
        window.myAppDb.from('payments').select('*')
      ]);

      const students = (usersRes.data || []).map(d => ({ ...normalizeDoc(d, 'users'), docId: d.id }));
      const events = (evRes.data || []).map(d => ({ ...normalizeDoc(d, 'events'), docId: d.id, eventId: d.id }));
      const payments = (payRes.data || []).map(d => ({ ...normalizeDoc(d, 'payments'), docId: d.id }));

      events.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      students.sort((a, b) => (a.studentId || '').localeCompare(b.studentId || '', undefined, { numeric: true }));

      let headers = ['รหัสนิสิต', 'ชื่อ-สกุล'];
      events.forEach(ev => headers.push(ev.title || 'รอบเก็บเงิน'));

      let rows = students.map(stu => {
        let row = {
          'รหัสนิสิต': stu.studentId || '-',
          'ชื่อ-สกุล': stu.name || '-'
        };
        events.forEach(ev => {
          const targetEvId = ev.eventId || ev.id;
          const userPays = payments.filter(p => 
            ((p.email && stu.email && p.email.trim().toLowerCase() === stu.email.trim().toLowerCase()) ||
             (p.studentId && stu.studentId && String(p.studentId).trim() === String(stu.studentId).trim())) &&
            (p.eventId === targetEvId || p.eventId === ev.id)
          );
          const paidPay = userPays.find(p => p.status === 'Paid');
          const pendingPay = userPays.find(p => p.status === 'Pending');
          const pay = paidPay || pendingPay || userPays[0];

          if (pay) {
            if (pay.status === 'Paid') {
              row[ev.title] = pay.paidAmount != null ? pay.paidAmount : (pay.totalAmount != null ? pay.totalAmount : ev.baseAmount);
            } else if (pay.status === 'Pending') {
              row[ev.title] = 'รอตรวจสอบ';
            } else {
              row[ev.title] = 'ค้างชำระ';
            }
          } else {
            row[ev.title] = 'ค้างชำระ';
          }
        });
        return row;
      });

      tHead.innerHTML = headers.map((h, i) =>
        `<th style="text-align:${i > 1 ? 'center' : 'left'}">${escapeHtml(h)}</th>`).join('');

      if (rows.length === 0) {
        tBody.innerHTML = `<tr><td colspan="${headers.length}" class="empty-state-cell"><div class="empty-state"><p>ยังไม่มีข้อมูลนิสิต</p></div></td></tr>`;
        updateEmptyStateAlignment();
      } else {
        tBody.innerHTML = rows.map(row => `
          <tr>
            ${headers.map((h, i) => {
              let val = row[h] || '-';
              if (i > 1) {
                if (val === 'Pending' || val === 'รอตรวจสอบ') return `<td style="color:#b45309;font-weight:700;text-align:center">รอตรวจสอบ</td>`;
                if (val === '-' || val === '' || val === 'ค้างชำระ') return `<td style="color:#dc2626;font-weight:700;text-align:center">ค้างชำระ</td>`;
                if (!isNaN(val)) return `<td style="color:#15803d;font-weight:700;text-align:center">฿${Number(val).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>`;
              }
              return `<td>${escapeHtml(val)}</td>`;
            }).join('')}
          </tr>`).join('');
      }
    } catch (e) {
      console.error('fetchMatrixData Error:', e);
      tBody.innerHTML = `<tr><td colspan="100" class="empty-state-cell"><div class="empty-state"><p style="color:var(--danger)">เชื่อมต่อล้มเหลว</p></div></td></tr>`;
      updateEmptyStateAlignment();
    }
  }

  // ─── OVERVIEW (Supabase Native) ───
  async function syncSystemStats() {
    try {
      const [paidRes, pendRes, incRes, expRes, evRes] = await Promise.all([
        window.myAppDb.from('payments').select('paid_amount').eq('status', 'Paid'),
        window.myAppDb.from('payments').select('id').eq('status', 'Pending'),
        window.myAppDb.from('incomes').select('amount'),
        window.myAppDb.from('expenses').select('amount'),
        window.myAppDb.from('events').select('id')
      ]);

      const paidPayments = paidRes.data || [];
      const pendingPayments = pendRes.data || [];
      const incomes = incRes.data || [];
      const expenses = expRes.data || [];
      const events = evRes.data || [];

      let totalPaidPayments = 0;
      paidPayments.forEach(d => totalPaidPayments += (Number(d.paid_amount) || 0));

      let totalIncome = 0;
      incomes.forEach(d => totalIncome += (Number(d.amount) || 0));

      let totalExpense = 0;
      expenses.forEach(d => totalExpense += (Number(d.amount) || 0));

      const totalBalance = totalPaidPayments + totalIncome - totalExpense;

      const newStats = {
        id: 'overview',
        paid_count: paidPayments.length,
        pending_count: pendingPayments.length,
        events_count: events.length,
        total_paid_payments: totalPaidPayments,
        total_income: totalIncome,
        total_expense: totalExpense,
        total_balance: totalBalance,
        updated_at: new Date().toISOString()
      };

      try {
        await window.myAppDb.from('system_stats').upsert(newStats);
      } catch (errSet) {
        console.warn("Could not save stats to DB, but returning calculated stats:", errSet);
      }
      return {
        paidCount: newStats.paid_count,
        pendingCount: newStats.pending_count,
        eventsCount: newStats.events_count,
        totalPaidPayments: newStats.total_paid_payments,
        totalIncome: newStats.total_income,
        totalExpense: newStats.total_expense,
        totalBalance: newStats.total_balance
      };
    } catch(e) {
      console.error("Sync stats error:", e);
      return {};
    }
  }

  async function loadOverview() {
    try {
      const [stats, payRes, expRes, incRes] = await Promise.all([
        syncSystemStats(),
        window.myAppDb.from('payments').select('*').eq('status', 'Pending').limit(5),
        window.myAppDb.from('expenses').select('*').order('created_at', { ascending: false }).limit(20),
        window.myAppDb.from('incomes').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      document.getElementById('statTotalEvents').textContent = stats.eventsCount != null ? stats.eventsCount : '—';
      document.getElementById('statPaid').textContent    = stats.paidCount != null ? stats.paidCount : '—';
      document.getElementById('statPending').textContent = stats.pendingCount != null ? stats.pendingCount : '—';

      const balance = stats.totalBalance != null ? stats.totalBalance : 0;
      document.getElementById('statTotal').textContent = Number(balance).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const tbody = document.getElementById('overviewPendingBody');
      const table = tbody ? tbody.closest('table') : null;
      const scrollWrap = tbody ? tbody.closest('.table-scroll') : null;
      const pendingList = (payRes.data || []).map(d => normalizeDoc(d, 'payments'));

      if (pendingList.length === 0) {
        if (table) table.classList.add('is-empty');
        if (scrollWrap) {
          scrollWrap.classList.add('is-empty');
          scrollWrap.scrollLeft = 0;
        }
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state-cell"><div class="empty-state"><p>ไม่มีสลิปรอการตรวจสอบ</p><div class="empty-state-sub">สลิปทั้งหมดได้รับการตรวจสอบเรียบร้อยแล้ว</div></div></td></tr>`;
        updateEmptyStateAlignment();
      } else {
        if (table) table.classList.remove('is-empty');
        if (scrollWrap) scrollWrap.classList.remove('is-empty');
        tbody.innerHTML = pendingList.map(p => {
          const pId = p.paymentId || p.id;
          paymentsCache[pId] = p;
          const slipBtn = p.slipUrl
            ? `<button class="btn btn-ghost btn-sm" onclick="viewPaymentSlip('${pId}')">ดูสลิป</button>`
            : '—';
          return `
            <tr>
              <td>${formatDate(p.paidAt)}</td>
              <td style="font-weight:700">${escapeHtml(p.name || '—')}</td>
              <td>${escapeHtml(p.eventTitle || p.eventId || '—')}</td>
              <td style="font-weight:700">${Number(p.paidAmount||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td>${Number(p.penalty||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td><span class="badge badge-pending">รอตรวจสอบ</span></td>
              <td>${slipBtn}</td>
            </tr>
          `;
        }).join('');
      }

      const expenses = (expRes.data || []).map(d => normalizeDoc(d, 'expenses'));
      const incomes  = (incRes.data || []).map(d => normalizeDoc(d, 'incomes'));

      renderAdminPublicBoard({ expenses, incomes, matrixHeaders: [], matrixRows: [] });
    } catch (e) {
      console.error('loadOverview error:', e);
    }
  }

  function renderAdminPublicBoard(data) {
    const fmt = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    (data.incomes || []).forEach(e => { financesCache['incomes_' + e.id] = { ...e, financeType: 'incomes' }; });
    (data.expenses || []).forEach(e => { financesCache['expenses_' + e.id] = { ...e, financeType: 'expenses' }; });

    const incomeRows = (data.incomes && data.incomes.length > 0)
      ? data.incomes.map(e => {
          const safeTitle = (e.source || 'รายรับ').replace(/'/g, "\\'");
          return `
          <div class="finance-item-row">
            <div class="finance-item-info">
              <div class="finance-item-title">${escapeHtml(e.source)}</div>
              <div class="finance-item-date">${new Date(e.date).toLocaleDateString('th-TH')}</div>
            </div>
            <div class="finance-item-right">
              <div class="finance-item-amount inc">฿${fmt(e.amount)}</div>
              <div class="finance-item-actions">
                ${e.receiptUrl ? `
                  <button type="button" class="btn-finance-action btn-proof" onclick="openSlipModal('${e.receiptUrl}', '${safeTitle}', '฿${fmt(e.amount)}')" title="ดูหลักฐานสลิป/ใบเสร็จ">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    <span>ดูหลักฐาน</span>
                  </button>` : ''}
                <button type="button" class="btn-finance-action btn-del" onclick="deleteFinanceRecord('incomes', '${e.id}')" title="ลบรายการนี้">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>ลบ</span>
                </button>
              </div>
            </div>
          </div>`;
        }).join('')
      : `<div style="font-size:0.8rem;color:var(--muted);padding:1rem;text-align:center">ไม่มีรายการรายรับ</div>`;

    const expenseRows = (data.expenses && data.expenses.length > 0)
      ? data.expenses.map(e => {
          const safeTitle = (e.title || 'รายจ่าย').replace(/'/g, "\\'");
          return `
          <div class="finance-item-row">
            <div class="finance-item-info">
              <div class="finance-item-title">${escapeHtml(e.title)}</div>
              <div class="finance-item-date">${new Date(e.date).toLocaleDateString('th-TH')}</div>
            </div>
            <div class="finance-item-right">
              <div class="finance-item-amount exp">฿${fmt(e.amount)}</div>
              <div class="finance-item-actions">
                ${e.receiptUrl ? `
                  <button type="button" class="btn-finance-action btn-proof" onclick="openSlipModal('${e.receiptUrl}', '${safeTitle}', '฿${fmt(e.amount)}')" title="ดูหลักฐานสลิป/ใบเสร็จ">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    <span>ดูหลักฐาน</span>
                  </button>` : ''}
                <button type="button" class="btn-finance-action btn-del" onclick="deleteFinanceRecord('expenses', '${e.id}')" title="ลบรายการนี้">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>ลบ</span>
                </button>
              </div>
            </div>
          </div>`;
        }).join('')
      : `<div style="font-size:0.8rem;color:var(--muted);padding:1rem;text-align:center">ไม่มีรายการใช้จ่าย</div>`;

    let html = `
      <div class="ledger-container" style="margin-top:2rem;">
        <div class="ledger-header"><div class="ledger-header-title">รายการใช้จ่ายเงินสาขา</div></div>
        <div style="padding:1.25rem;">
          <div style="font-size:0.75rem;font-weight:700;color:var(--success);text-transform:uppercase;margin-bottom:0.5rem">รายรับ</div>
          <div style="background:#ffffff;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:1.5rem;">
            ${incomeRows}
          </div>
          <div style="font-size:0.75rem;font-weight:700;color:var(--danger);text-transform:uppercase;margin-bottom:0.5rem">รายจ่าย</div>
          <div style="background:#ffffff;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;">
            ${expenseRows}
          </div>
        </div>
      </div>
    `;
    const pbContainer = document.getElementById('overviewPublicBoard');
    if (pbContainer) pbContainer.innerHTML = html;
  }

  // ─── EVENTS (Supabase Native) ───
  async function fetchEventsData() {
    const tbody = document.getElementById('eventsTableBody');
    tbody.innerHTML = `<tr><td colspan="5"><div class="skeleton"></div></td></tr>`;
    try {
      const { data, error } = await window.myAppDb.from('events').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      eventsCache = {};
      const list = (data || []).map(d => {
        const ev = normalizeDoc(d, 'events');
        eventsCache[ev.id] = ev;
        return ev;
      });

      if (list.length > 0) {
        tbody.innerHTML = list.map(ev => {
          return `
          <tr>
            <td style="font-weight:700">${escapeHtml(ev.title)}</td>
            <td style="font-weight:700">${Number(ev.baseAmount).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td>${formatDate(ev.dueDate)}</td>
            <td style="color:var(--muted);font-size:0.75rem">${formatDate(ev.createdAt)}</td>
            <td><button class="btn btn-danger-ghost btn-sm" onclick="deleteEvent('${ev.id}')">ลบ</button></td>
          </tr>`;
        }).join('');
        updateEmptyStateAlignment();
      } else {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state-cell"><div class="empty-state"><p>ยังไม่มีรอบเก็บเงิน</p></div></td></tr>`;
        updateEmptyStateAlignment();
      }
    } catch(e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state-cell"><div class="empty-state"><p style="color:var(--danger)">เชื่อมต่อไม่ได้</p></div></td></tr>`;
      updateEmptyStateAlignment();
    }
  }

  async function deleteEvent(eventId) {
    let ev = eventsCache[eventId];
    if (!ev) {
      try {
        const { data: d } = await window.myAppDb.from('events').select('*').eq('id', eventId).maybeSingle();
        if (d) ev = normalizeDoc(d, 'events');
      } catch (_) {}
    }
    ev = ev || {};
    const evTitle = ev.title || 'รอบเก็บเงิน';
    const evAmount = ev.baseAmount != null ? `฿${Number(ev.baseAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
    const evDueDate = ev.dueDate ? formatDate(ev.dueDate) : '';

    const confirmed = await showActionConfirmModal({
      type: 'danger',
      title: 'ยืนยันการลบรอบเก็บเงิน',
      desc: 'คุณต้องการลบรอบเก็บเงินนี้ออกจากระบบใช่หรือไม่?',
      items: [
        { label: 'ชื่อรอบเก็บเงิน', value: evTitle, highlight: true },
        evAmount ? { label: 'จำนวนเงิน', value: evAmount } : null,
        evDueDate ? { label: 'วันครบกำหนด', value: evDueDate } : null,
      ].filter(Boolean),
      warning: 'หากลบรอบเก็บเงินนี้ คอลัมน์รอบนี้จะถูกลบออกจากตารางเช็คเงินของทุกคนทันที',
      confirmText: 'ยืนยันลบรอบเก็บเงิน',
      confirmBtnClass: 'btn-danger'
    });

    if (!confirmed) return;

    try {
      // 1. ค้นหาและลบรูปภาพสลิปทั้งหมดในคลัง (Storage) ที่ผูกกับรอบเก็บเงินนี้
      try {
        const { data: files } = await window.myAppDb.storage.from('slips').list(eventId);
        if (files && files.length > 0) {
          const filePaths = files.map(f => `${eventId}/${f.name}`);
          const { error: sErr } = await window.myAppDb.storage.from('slips').remove(filePaths);
          if (sErr) console.warn('Storage event files remove error:', sErr);
        }
      } catch (errStorage) {
        console.warn('Storage cleanup for event error:', errStorage);
      }

      // 2. ลบข้อมูลการชำระเงินทั้งหมดที่ผูกกับรอบนี้
      await window.myAppDb.from('payments').delete().eq('event_id', eventId);

      // 3. ลบรอบเก็บเงินออกจากฐานข้อมูล
      await window.myAppDb.from('events').delete().eq('id', eventId);
      showToast(`ลบรอบเก็บเงิน "${evTitle}" สำเร็จ`);
      await fetchEventsData();
      await fetchPaymentsData();
      await syncStudentMatrix();
      loadOverview();
    } catch(e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการลบ');
    }
  }

  async function syncStudentMatrix(isManual = false) {
    const btn = document.getElementById('btnSyncMatrix');
    if (isManual && btn) { btn.disabled = true; btn.textContent = 'กำลังโหลด...'; }
    try {
      await fetchMatrixData();
      if (isManual) {
        showToast('อัปเดตข้อมูลตารางล่าสุดแล้ว');
      }
    } catch (e) {
      console.error('syncStudentMatrix Error:', e);
      if (isManual) showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      if (isManual && btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> รีเฟรชตาราง`;
      }
    }
  }

  async function handleCreateEvent() {
    const title   = document.getElementById('evTitle').value.trim();
    const amount  = document.getElementById('evAmount').value.trim();
    const dueDate = document.getElementById('evDueDate').value;
    if (!title || !amount || !dueDate) { showToast('กรุณากรอกข้อมูลให้ครบ'); return; }

    const btn = document.getElementById('btnCreateEvent');
    btn.disabled = true; btn.textContent = 'กำลังสร้าง...';

    try {
      const eventId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const dueDateISO = new Date(dueDate).toISOString();

      const { error: evErr } = await window.myAppDb.from('events').insert({
        id: eventId,
        title,
        base_amount: Number(amount),
        due_date: dueDateISO,
        created_at: createdAt
      });
      if (evErr) throw evErr;

      try {
        const { data: st } = await window.myAppDb.from('system_stats').select('events_count').eq('id', 'overview').maybeSingle();
        const curEvCount = st && st.events_count != null ? Number(st.events_count) : 0;
        await window.myAppDb.from('system_stats').update({
          events_count: curEvCount + 1,
          updated_at: new Date().toISOString()
        }).eq('id', 'overview');
      } catch (errStats) {
        console.warn('System stats update error:', errStats);
      }

      showToast('สร้างรอบเก็บเงินเรียบร้อย');
      document.getElementById('evTitle').value = '';
      document.getElementById('evAmount').value = '';
      setTodayDate('evDueDate');
      await syncStudentMatrix();
      fetchEventsData();
      loadOverview();
    } catch(e) {
      console.error(e);
      showToast('เชื่อมต่อล้มเหลว: ' + e.message);
    } finally {
      btn.disabled = false; btn.textContent = 'สร้างรอบเก็บเงิน';
    }
  }

  // ─── PAYMENTS (Supabase Native) ───
  async function fetchPaymentsData() {
    const tbody = document.getElementById('paymentsTableBody');
    tbody.innerHTML = `<tr><td colspan="8"><div class="skeleton"></div></td></tr>`;
    try {
      const { data, error } = await window.myAppDb.from('payments').select('*').order('paid_at', { ascending: false });
      if (error) throw error;
      allPayments = (data || []).map(d => {
        const item = normalizeDoc(d, 'payments');
        const pId = item.paymentId || item.id;
        paymentsCache[pId] = item;
        return item;
      });
      applyPaymentFilters();
    } catch(e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="8" style="color:var(--danger)">เชื่อมต่อล้มเหลว</td></tr>`;
    }
  }

  function renderPaymentsTable(list) {
    const tbody = document.getElementById('paymentsTableBody');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state-cell"><div class="empty-state"><p>ไม่มีรายการที่ค้นหา</p></div></td></tr>`;
      updateEmptyStateAlignment();
      return;
    }
    tbody.innerHTML = list.map(p => {
      const pId = p.paymentId || p.id;
      paymentsCache[pId] = p;
      const safeTitle = (p.eventTitle || p.eventId || '').replace(/'/g, "\\'");
      const safeName = (p.name || '').replace(/'/g, "\\'");
      const slipBtn = p.slipUrl
        ? `<button class="btn btn-ghost btn-sm" onclick="viewPaymentSlip('${pId}')">ดูสลิป</button>`
        : '—';

      return `
        <tr>
          <td style="font-weight:700">${escapeHtml(p.name || '—')}</td>
          <td>${escapeHtml(p.eventTitle || p.eventId || '—')}</td>
          <td style="font-weight:700">${Number(p.paidAmount).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          <td>${Number(p.penalty||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          <td><span class="badge badge-${p.status === 'Paid' ? 'paid' : 'pending'}">${p.status === 'Paid' ? 'ชำระแล้ว' : 'รอตรวจสอบ'}</span></td>
          <td style="font-size:0.75rem;color:var(--muted)">${formatDate(p.paidAt)}</td>
          <td>${slipBtn}</td>
          <td>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${p.status === 'Pending' ? `<button class="btn btn-primary btn-sm" onclick="approve('${pId}','${safeTitle}','${p.email}',${p.paidAmount})">อนุมัติ</button>` : ''}
              <button class="btn btn-danger-ghost btn-sm" onclick="deletePayment('${pId}')">ลบ</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    updateEmptyStateAlignment();
  }

  async function deletePayment(paymentId) {
    let p = paymentsCache[paymentId] 
         || allPayments.find(x => (x.paymentId === paymentId || x.id === paymentId));

    if (!p) {
      try {
        const { data: d } = await window.myAppDb.from('payments').select('*').eq('id', paymentId).maybeSingle();
        if (d) p = normalizeDoc(d, 'payments');
      } catch (_) {}
    }
    p = p || {};

    const studentName = p.name || 'ไม่ระบุชื่อ';
    const roundTitle = p.eventTitle || p.eventId || 'ไม่ระบุรอบ';
    const amountVal = Number(p.paidAmount || 0);
    const penaltyVal = Number(p.penalty || 0);
    const amountStr = `฿${amountVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const statusStr = p.status === 'Paid' ? 'ชำระแล้ว' : 'รอตรวจสอบ';

    const confirmed = await showActionConfirmModal({
      type: 'danger',
      title: 'ยืนยันการลบรายการชำระเงิน',
      desc: 'คุณต้องการลบข้อมูลการชำระเงินของนิสิตคนนี้ใช่หรือไม่?',
      items: [
        { label: 'ชื่อ-นามสกุล', value: studentName, highlight: true },
        { label: 'รอบการชำระ', value: roundTitle },
        { label: 'ยอดชำระ', value: penaltyVal > 0 ? `${amountStr} (รวมค่าปรับ ฿${penaltyVal.toLocaleString('th-TH', { minimumFractionDigits: 2 })})` : amountStr },
        { label: 'สถานะปัจจุบัน', value: statusStr }
      ],
      warning: 'หากลบแล้ว สถานะของนิสิตจะกลับไปเป็น "ค้างชำระ" ทันที และไฟล์สลิปหลักฐานจะถูกลบออกจากระบบ',
      confirmText: 'ยืนยันลบรายการ',
      confirmBtnClass: 'btn-danger'
    });

    if (!confirmed) return;
    
    try {
      const { data: tData } = await window.myAppDb.from('payments').select('*').eq('id', paymentId).maybeSingle();
      if (tData) {
        const slip = tData.slip_url || tData.slipUrl;
        if (slip && slip.includes('supabase.co')) {
          const rawName = slip.split('/public/slips/')[1].split('?')[0];
          const fileName = decodeURIComponent(rawName);
          const { error: sErr } = await window.myAppDb.storage.from('slips').remove([fileName]);
          if (sErr) console.warn('Storage slip remove error:', sErr);
        }
      }
      
      await window.myAppDb.from('payments').delete().eq('id', paymentId);
      showToast(`ลบรายการของ "${studentName}" สำเร็จ`);
      await fetchPaymentsData();
      await syncStudentMatrix();
      loadOverview();
    } catch(e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการลบ');
    }
  }

  let currentPaymentStatus = 'all';
  let currentPaymentPage = 1;
  const PAYMENTS_PER_PAGE = 50;
  let currentFilteredPayments = [];

  function filterPayments(status, el) {
    document.querySelectorAll('#view-payments .filter-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    currentPaymentStatus = status;
    applyPaymentFilters();
  }

  function applyPaymentFilters() {
    const term = (document.getElementById('paymentSearchInput').value || '').trim().toLowerCase();
    
    let list = currentPaymentStatus === 'all' ? allPayments : allPayments.filter(p => p.status === currentPaymentStatus);
    
    if (term) {
      list = list.filter(p => {
        const name = (p.name || '').toLowerCase();
        const title = (p.eventTitle || '').toLowerCase();
        const studentId = (p.studentId || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        return name.includes(term) || title.includes(term) || studentId.includes(term) || email.includes(term);
      });
    }
    currentFilteredPayments = list;
    currentPaymentPage = 1;
    renderPaginatedPayments();
  }

  function renderPaginatedPayments() {
    const total = currentFilteredPayments.length;
    const totalPages = Math.ceil(total / PAYMENTS_PER_PAGE) || 1;
    if (currentPaymentPage > totalPages) currentPaymentPage = totalPages;
    if (currentPaymentPage < 1) currentPaymentPage = 1;

    const startIdx = (currentPaymentPage - 1) * PAYMENTS_PER_PAGE;
    const endIdx = Math.min(startIdx + PAYMENTS_PER_PAGE, total);
    const pagedList = currentFilteredPayments.slice(startIdx, endIdx);

    renderPaymentsTable(pagedList);

    const pageInfo = document.getElementById('paymentsPageInfo');
    const pageNum = document.getElementById('paymentsPageNum');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    const paginationBar = document.getElementById('paymentsPagination');

    if (pageInfo) {
      pageInfo.textContent = total > 0 
        ? `แสดงรายการที่ ${startIdx + 1}–${endIdx} จากทั้งหมด ${total.toLocaleString('th-TH')} รายการ`
        : `ไม่พบรายการที่ตรงกับเงื่อนไข`;
    }
    if (pageNum) pageNum.textContent = `หน้า ${currentPaymentPage} / ${totalPages}`;
    if (btnPrev) btnPrev.disabled = (currentPaymentPage <= 1);
    if (btnNext) btnNext.disabled = (currentPaymentPage >= totalPages);
    if (paginationBar) paginationBar.style.display = total === 0 ? 'none' : 'flex';
  }

  function changePaymentPage(delta) {
    currentPaymentPage += delta;
    renderPaginatedPayments();
    const tableWrap = document.querySelector('#view-payments .table-scroll');
    if (tableWrap) tableWrap.scrollTop = 0;
  }

  async function approve(paymentId, eventTitle, email, totalAmount) {
    const p = paymentsCache[paymentId] 
           || allPayments.find(x => (x.paymentId === paymentId || x.id === paymentId)) 
           || {};
    const studentName = p.name || 'นิสิต';
    const roundTitle = eventTitle || p.eventTitle || p.eventId || 'รอบการชำระ';
    const amountVal = Number(totalAmount != null ? totalAmount : (p.paidAmount || 0));
    const amountStr = `฿${amountVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const confirmed = await showActionConfirmModal({
      type: 'success',
      title: 'ยืนยันการอนุมัติสลิปโอนเงิน',
      desc: 'โปรดตรวจสอบความถูกต้องของสลิปและยอดเงินก่อนกดยืนยัน',
      items: [
        { label: 'ชื่อ-นามสกุล', value: studentName, highlight: true },
        { label: 'รอบการชำระ', value: roundTitle },
        { label: 'ยอดเงินที่อนุมัติ', value: amountStr },
        (p.email || email) ? { label: 'อีเมลนิสิต', value: (p.email || email) } : null
      ].filter(Boolean),
      info: 'เมื่ออนุมัติแล้ว สถานะจะเปลี่ยนเป็น "ชำระแล้ว" ทันที และยอดเงินจะถูกบันทึกเข้าระบบ',
      confirmText: 'ยืนยันอนุมัติสลิป',
      confirmBtnClass: 'btn-primary'
    });

    if (!confirmed) return;

    try {
      const { error: payErr } = await window.myAppDb.from('payments').update({ status: 'Paid' }).eq('id', paymentId);
      if (payErr) throw payErr;

      const amountNum = Number(totalAmount) || 0;
      try {
        const { data: st } = await window.myAppDb.from('system_stats').select('*').eq('id', 'overview').maybeSingle();
        if (st) {
          const curPaid = Number(st.paid_count) || 0;
          const curPending = Number(st.pending_count) || 0;
          const curTotalPaid = Number(st.total_paid_payments) || 0;
          const curBalance = Number(st.total_balance) || 0;
          await window.myAppDb.from('system_stats').update({
            paid_count: curPaid + 1,
            pending_count: Math.max(0, curPending - 1),
            total_paid_payments: curTotalPaid + amountNum,
            total_balance: curBalance + amountNum,
            updated_at: new Date().toISOString()
          }).eq('id', 'overview');
        }
      } catch (e) {
        console.error("Stats error:", e);
      }

      showToast(`อนุมัติสลิปของ "${studentName}" สำเร็จ`);
      
      try {
        await syncStudentMatrix();
      } catch (e) {
        console.error("Matrix error:", e);
      }
      
      fetchPaymentsData();
      loadOverview();
    } catch(e) {
      console.error(e);
      showToast('เชื่อมต่อล้มเหลว');
    }
  }

  // ─── FINANCE ───
  function switchFinance(tab, el) {
    const isExp = tab === 'expense';
    document.getElementById('expenseForm').style.display = isExp ? 'block' : 'none';
    document.getElementById('incomeForm').style.display  = isExp ? 'none'  : 'block';
    document.querySelectorAll('#view-finance .filter-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    initAllDateInputs();
  }

  function previewFile(input, type, legacyNameId) {
    const file = input.files && input.files[0];
    const prefix = (type === 'expPreview' || type === 'exp') ? 'exp' : ((type === 'incPreview' || type === 'inc') ? 'inc' : type);
    
    const dropzone = document.getElementById(prefix + 'UploadArea');
    const prompt = document.getElementById(prefix + 'UploadPrompt');
    const attached = document.getElementById(prefix + 'UploadAttached');
    const filename = document.getElementById(prefix + 'FileName');
    const previewImg = document.getElementById(prefix + 'Preview');

    if (!file) {
      clearFile(prefix);
      return;
    }

    if (filename) filename.textContent = file.name;
    if (prompt) prompt.style.display = 'none';
    if (attached) attached.style.display = 'flex';
    if (dropzone) dropzone.classList.add('has-file');

    const reader = new FileReader();
    reader.onload = e => {
      if (previewImg) {
        previewImg.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  function clearFile(prefix) {
    const input = document.getElementById(prefix === 'exp' ? 'expReceiptFile' : 'incReceiptFile');
    const dropzone = document.getElementById(prefix + 'UploadArea');
    const prompt = document.getElementById(prefix + 'UploadPrompt');
    const attached = document.getElementById(prefix + 'UploadAttached');
    const filename = document.getElementById(prefix + 'FileName');
    const previewImg = document.getElementById(prefix + 'Preview');

    if (input) input.value = '';
    if (filename) filename.textContent = '';
    if (prompt) prompt.style.display = 'block';
    if (attached) attached.style.display = 'none';
    if (dropzone) dropzone.classList.remove('has-file');
    if (previewImg) {
      previewImg.src = '';
    }
  }

  window.openAdminLightbox = function(prefix, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const previewImg = document.getElementById(prefix + 'Preview');
    const filename = document.getElementById(prefix + 'FileName')?.textContent || 'หลักฐานที่แนบ';
    const label = prefix === 'exp' ? 'ใบเสร็จรายจ่าย' : 'หลักฐานรายรับ';
    if (previewImg && previewImg.src) {
      openSlipModal(previewImg.src, `${label} (${filename})`, '');
    }
  };

  function fileToBlob(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let maxWidth = 800;
          let scale = 1;
          if (img.width > maxWidth) scale = maxWidth / img.width;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }

  async function handleAddExpense(btn) {
    const title     = document.getElementById('expTitle').value.trim();
    const amount    = document.getElementById('expAmount').value.trim();
    const date      = document.getElementById('expDate').value;
    const fileInput = document.getElementById('expReceiptFile');
    
    if (!title || !amount || !date) { showToast('กรุณากรอกข้อมูลให้ครบ'); return; }
    
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }
    try {
      let receiptUrl = '';
      if (fileInput && fileInput.files.length) {
        const compressedBlob = await fileToBlob(fileInput.files[0]);
        const fileName = `expenses/exp_${crypto.randomUUID()}.jpg`;
        const { data, error } = await window.myAppDb.storage.from('slips').upload(fileName, compressedBlob, { contentType: 'image/jpeg' });
        if (error) throw new Error('อัปโหลดรูปไม่สำเร็จ: ' + error.message);
        const { data: { publicUrl } } = window.myAppDb.storage.from('slips').getPublicUrl(fileName);
        receiptUrl = publicUrl;
      }

      const expId = crypto.randomUUID();
      const { error: insErr } = await window.myAppDb.from('expenses').insert({
        id: expId,
        title: title,
        amount: Number(amount),
        receipt_url: receiptUrl,
        created_at: new Date(date).toISOString()
      });
      if (insErr) throw insErr;

      const expAmountNum = Number(amount) || 0;
      try {
        const { data: st } = await window.myAppDb.from('system_stats').select('*').eq('id', 'overview').maybeSingle();
        if (st) {
          await window.myAppDb.from('system_stats').update({
            total_expense: (Number(st.total_expense) || 0) + expAmountNum,
            total_balance: (Number(st.total_balance) || 0) - expAmountNum,
            updated_at: new Date().toISOString()
          }).eq('id', 'overview');
        }
      } catch (stErr) { console.warn(stErr); }

      showToast('บันทึกรายจ่ายเรียบร้อยแล้ว');
      document.getElementById('expTitle').value  = '';
      document.getElementById('expAmount').value = '';
      setTodayDate('expDate');
      clearFile('exp');
      loadOverview();
    } catch(e) {
      console.error(e);
      showToast('เชื่อมต่อล้มเหลว: ' + e.message);
    }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'บันทึกรายจ่าย'; } }
  }

  async function handleAddIncome(btn) {
    const source    = document.getElementById('incSource').value.trim();
    const amount    = document.getElementById('incAmount').value.trim();
    const date      = document.getElementById('incDate').value;
    const fileInput = document.getElementById('incReceiptFile');
    
    if (!source || !amount || !date) { showToast('กรุณากรอกข้อมูลให้ครบ'); return; }
    
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }
    try {
      let receiptUrl = '';
      if (fileInput && fileInput.files.length) {
        const compressedBlob = await fileToBlob(fileInput.files[0]);
        const fileName = `incomes/inc_${crypto.randomUUID()}.jpg`;
        const { data, error } = await window.myAppDb.storage.from('slips').upload(fileName, compressedBlob, { contentType: 'image/jpeg' });
        if (error) throw new Error('อัปโหลดรูปไม่สำเร็จ: ' + error.message);
        const { data: { publicUrl } } = window.myAppDb.storage.from('slips').getPublicUrl(fileName);
        receiptUrl = publicUrl;
      }

      const incId = crypto.randomUUID();
      const { error: insErr } = await window.myAppDb.from('incomes').insert({
        id: incId,
        source: source,
        amount: Number(amount),
        receipt_url: receiptUrl,
        created_at: new Date(date).toISOString()
      });
      if (insErr) throw insErr;

      const incAmountNum = Number(amount) || 0;
      try {
        const { data: st } = await window.myAppDb.from('system_stats').select('*').eq('id', 'overview').maybeSingle();
        if (st) {
          await window.myAppDb.from('system_stats').update({
            total_income: (Number(st.total_income) || 0) + incAmountNum,
            total_balance: (Number(st.total_balance) || 0) + incAmountNum,
            updated_at: new Date().toISOString()
          }).eq('id', 'overview');
        }
      } catch (stErr) { console.warn(stErr); }

      showToast('บันทึกรายรับเรียบร้อยแล้ว');
      document.getElementById('incSource').value = '';
      document.getElementById('incAmount').value = '';
      setTodayDate('incDate');
      clearFile('inc');
      loadOverview();
    } catch(e) {
      console.error(e);
      showToast('เชื่อมต่อล้มเหลว: ' + e.message);
    }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'บันทึกรายรับ'; } }
  }

  // ─── EXPORT EXCEL (ตารางเช็คยอดนิสิตทุกคน) ───
  function openExportModal() {
    exportStudentExcel();
  }

  function closeExportModal() {}

  function formatDateForFile(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  function formatDateTime(val) {
    if (!val) return '-';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function csvCell(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim().replace(/"/g, '""');
    return `"${str}"`;
  }

  function downloadCSV(filename, csvContent) {
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportStudentExcel() {
    showToast('กำลังเตรียมไฟล์ Excel รวมตารางเช็คยอดและรายการใช้จ่าย...');
    try {
      const [usersRes, evRes, payRes, incRes, expRes] = await Promise.all([
        window.myAppDb.from('users').select('*').eq('role', 'Student'),
        window.myAppDb.from('events').select('*'),
        window.myAppDb.from('payments').select('*'),
        window.myAppDb.from('incomes').select('*'),
        window.myAppDb.from('expenses').select('*')
      ]);

      const students = (usersRes.data || []).map(d => ({ ...normalizeDoc(d, 'users'), docId: d.id }));
      const events = (evRes.data || []).map(d => ({ ...normalizeDoc(d, 'events'), docId: d.id, eventId: d.id }));
      const payments = (payRes.data || []).map(d => ({ ...normalizeDoc(d, 'payments'), docId: d.id }));
      const incomes = (incRes.data || []).map(d => ({ ...normalizeDoc(d, 'incomes'), docId: d.id }));
      const expenses = (expRes.data || []).map(d => ({ ...normalizeDoc(d, 'expenses'), docId: d.id }));

      // เรียงลำดับรอบเก็บเงินตามวันเวลาที่สร้าง จากเก่าสุดไปใหม่สุด (ล่าสุด)
      events.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

      // เรียงลำดับนิสิตตามรหัสนิสิต (67xxxxxx, 68xxxxxx)
      students.sort((a, b) => (a.studentId || '').localeCompare(b.studentId || '', undefined, { numeric: true }));

      // ═══════════════════════════════════════════════════════════
      // แผ่นงานที่ 1: ตารางเช็คยอด (Sheet 1: Matrix Ledger)
      // ═══════════════════════════════════════════════════════════
      const headers1 = ['รหัสนิสิต', 'ชื่อ-นามสกุล'];
      events.forEach(ev => {
        headers1.push(ev.title || 'รอบเก็บเงิน');
      });

      const rows1 = students.map(stu => {
        const row = [
          stu.studentId || '-',
          stu.name || '-'
        ];

        events.forEach(ev => {
          const targetEvId = ev.eventId || ev.docId;
          const userPays = payments.filter(p =>
            ((p.email && stu.email && p.email.trim().toLowerCase() === stu.email.trim().toLowerCase()) ||
             (p.studentId && stu.studentId && String(p.studentId).trim() === String(stu.studentId).trim())) &&
            (p.eventId === targetEvId || p.eventId === ev.docId)
          );
          const paidPay = userPays.find(p => p.status === 'Paid');
          const pendingPay = userPays.find(p => p.status === 'Pending');
          const pay = paidPay || pendingPay || userPays[0];

          if (pay && pay.status === 'Paid') {
            const amount = Number(pay.paidAmount || pay.totalAmount || ev.baseAmount || 0);
            row.push(amount);
          } else if (pay && pay.status === 'Pending') {
            row.push('รอตรวจสอบ');
          } else {
            row.push('ค้างชำระ');
          }
        });

        return row;
      });

      // ═══════════════════════════════════════════════════════════
      // แผ่นงานที่ 2: รายการใช้จ่ายเงินของสาขา (Sheet 2: Branch Finance)
      // แถว A: รายการใช้จ่าย, แถว B: จำนวนเงิน (ตัวเข้ม), แถว C: ยอดเงินคงเหลือ
      // ═══════════════════════════════════════════════════════════
      const financeItems = [];

      // 1. รวมยอดเงินกองทุนนิสิตที่ชำระแล้วตามแต่ละรอบกิจกรรม
      const eventPaidMap = {};
      payments.forEach(p => {
        if (p.status === 'Paid') {
          const evKey = p.eventId || 'other';
          const amt = Number(p.paidAmount || p.totalAmount || p.amount || 0);
          eventPaidMap[evKey] = (eventPaidMap[evKey] || 0) + amt;
        }
      });

      events.forEach(ev => {
        const targetEvId = ev.eventId || ev.docId;
        const totalPaid = eventPaidMap[targetEvId] || eventPaidMap[ev.docId] || 0;
        if (totalPaid > 0) {
          financeItems.push({
            date: ev.createdAt || '',
            title: `เงินกองทุนนิสิต - ${ev.title || 'รอบเก็บเงิน'}`,
            amount: totalPaid,
            type: 'income'
          });
        }
      });

      // 2. รายการรายรับ (เงินสนับสนุน/สปอนเซอร์)
      incomes.forEach(inc => {
        financeItems.push({
          date: inc.date || inc.createdAt || inc.timestamp || '',
          title: inc.source || inc.title || 'รายรับเงินสนับสนุน',
          amount: Number(inc.amount || 0),
          type: 'income'
        });
      });

      // 3. รายการรายจ่าย (ค่าใช้จ่ายกิจกรรมสาขา) - บันทึกเป็นยอดลบเพื่อให้สูตร =SUM(B2:B999) คำนวณหักลบยอดคงเหลือถูกต้อง
      expenses.forEach(exp => {
        financeItems.push({
          date: exp.date || exp.createdAt || exp.timestamp || '',
          title: exp.title || 'รายจ่ายกิจกรรมสาขา',
          amount: -Math.abs(Number(exp.amount || 0)),
          type: 'expense'
        });
      });

      // เรียงลำดับรายการตามวันเวลาจากเก่าไปใหม่
      financeItems.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

      const headers2 = ['รายการใช้จ่าย', 'จำนวนเงิน', 'ยอดเงินคงเหลือ'];
      const rows2 = financeItems.map(item => [
        item.title,
        item.amount,
        '' // เว้นช่อง C2 ไว้สำหรับสูตรคำนวณ =SUM(B2:B999)
      ]);

      const filename = `สรุปบัญชีและตารางเช็คยอด_BEC_BA_69_${formatDateForFile()}.xlsx`;

      if (window.XLSX) {
        const wb = XLSX.utils.book_new();

        // ────────── สร้าง Sheet 1: ตารางเช็คยอด ──────────
        const ws1 = XLSX.utils.aoa_to_sheet([headers1, ...rows1]);

        ws1['!cols'] = [
          { wch: 16 }, // คอลัมน์ A: รหัสนิสิต
          { wch: 28 }, // คอลัมน์ B: ชื่อ-นามสกุล
          ...events.map(ev => ({ wch: Math.max((ev.title || '').length * 2, 16) })) // คอลัมน์ C เป็นต้นไป
        ];

        // สไตล์ Sheet 1 หัวตาราง
        for (let C = 0; C < headers1.length; ++C) {
          const headerCell = ws1[XLSX.utils.encode_cell({ r: 0, c: C })];
          if (headerCell) {
            headerCell.s = {
              font: { bold: true },
              alignment: C >= 2 ? { horizontal: 'center', vertical: 'center' } : { vertical: 'center' }
            };
          }
        }

        // สไตล์ Sheet 1 ข้อมูลนิสิต
        for (let R = 1; R <= rows1.length; ++R) {
          for (let C = 2; C < headers1.length; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws1[cellAddress];
            if (!cell) continue;

            if (cell.v === 'ค้างชำระ') {
              cell.s = {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { color: { rgb: 'FFFF0000' }, bold: true }
              };
            } else if (cell.v === 'รอตรวจสอบ') {
              cell.s = {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { color: { rgb: 'FFD97706' }, bold: true }
              };
            } else {
              cell.s = {
                alignment: { horizontal: 'center', vertical: 'center' }
              };
            }
          }
        }

        // ────────── สร้าง Sheet 2: รายการใช้จ่าย ──────────
        const ws2 = XLSX.utils.aoa_to_sheet([headers2, ...rows2]);

        ws2['!cols'] = [
          { wch: 45 }, // คอลัมน์ A: รายการใช้จ่าย
          { wch: 20 }, // คอลัมน์ B: จำนวนเงิน
          { wch: 22 }  // คอลัมน์ C: ยอดเงินคงเหลือ
        ];

        // สไตล์ Sheet 2 หัวตาราง (Row 0)
        const h2_A = ws2['A1'];
        if (h2_A) h2_A.s = { font: { bold: true }, alignment: { vertical: 'center' } };

        const h2_B = ws2['B1'];
        if (h2_B) h2_B.s = { font: { bold: true }, alignment: { horizontal: 'right', vertical: 'center' } };

        const h2_C = ws2['C1'];
        if (h2_C) h2_C.s = { font: { bold: true, sz: 11 }, alignment: { horizontal: 'center', vertical: 'center' } };

        // สไตล์ Sheet 2 ข้อมูลรายรับ-รายจ่าย (Row 1 ถึง Row N)
        for (let R = 1; R <= rows2.length; ++R) {
          const item = financeItems[R - 1];
          const cellA = ws2[XLSX.utils.encode_cell({ r: R, c: 0 })];
          if (cellA) {
            cellA.s = { alignment: { vertical: 'center' } };
          }

          const cellB = ws2[XLSX.utils.encode_cell({ r: R, c: 1 })];
          if (cellB) {
            const isInc = item && item.type === 'income';
            cellB.z = '#,##0.00';
            cellB.s = {
              font: {
                bold: true,
                color: { rgb: isInc ? 'FF16A34A' : 'FFFF0000' } // รายรับตัวเลขสีเขียว รายจ่ายตัวเลขสีแดง
              },
              alignment: { horizontal: 'right', vertical: 'center' }
            };
          }
        }

        // เซลล์ C2: ใส่สูตร =SUM(B2:B999) คำนวณยอดเงินคงเหลือ
        const calculatedBalance = financeItems.reduce((acc, it) => acc + it.amount, 0);
        ws2['C2'] = {
          t: 'n',
          f: 'SUM(B2:B999)',
          v: calculatedBalance,
          z: '#,##0.00',
          s: {
            font: { bold: true, sz: 12 },
            alignment: { horizontal: 'center', vertical: 'center' }
          }
        };

        // เพิ่มแผ่นงานทั้ง 2 แผ่นลงในไฟล์เดียวกัน (เหมือนกดปุ่ม + ใน Excel)
        XLSX.utils.book_append_sheet(wb, ws1, "ตารางเช็คยอด");
        XLSX.utils.book_append_sheet(wb, ws2, "รายการใช้จ่าย");

        XLSX.writeFile(wb, filename);
        showToast('ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว');
      } else {
        // Fallback เป็น CSV เข้ารหัส UTF-8 BOM สำหรับเปิดใน Excel
        const csvRows1 = [headers1, ...rows1].map(r => r.map(csvCell).join(',')).join('\r\n');
        downloadCSV(`ตารางเช็คยอด_BEC_BA_69_${formatDateForFile()}.csv`, csvRows1);
        showToast('ดาวน์โหลดไฟล์เรียบร้อยแล้ว');
      }
    } catch (e) {
      console.error('exportStudentExcel error:', e);
      showToast('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์');
    }
  }

  // รองรับฟังก์ชันเดิม
  const exportStudentMatrixCSV = exportStudentExcel;
  const exportAllHandoverPackage = exportStudentExcel;

  // ─── UTILS ───
  function formatDate(val) {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d)) return val;
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
  }

  async function logout() {
    if (window.myAppDb && window.myAppDb.auth) {
      await window.myAppDb.auth.signOut();
    }
    sessionStorage.removeItem('loggedInUser');
    location.href = 'index.html';
  }

  async function emergencyReset() {
    if (!confirm("คำเตือน: คุณแน่ใจหรือไม่ที่จะล้างข้อมูลทั้งหมด?")) return;
    showToast("กำลังล้างข้อมูล... โปรดรอสักครู่");
    async function deleteCol(colName) {
      await window.myAppDb.from(colName).delete().neq('id', '___non_existent___');
    }
    try {
      await deleteCol('events');
      await deleteCol('payments');
      await deleteCol('expenses');
      await deleteCol('incomes');
      try { await window.myAppDb.from('student_matrix').delete().eq('id', 'current'); } catch (_) {}
      alert("ล้างฐานข้อมูลสำเร็จเรียบร้อยแล้ว");
      window.location.reload();
    } catch(e) {
      console.error(e);
      alert("เกิดข้อผิดพลาด: " + e.message);
    }
  }
