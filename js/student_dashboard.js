  const PROMPTPAY_ID  = "004999246368459"; // พร้อมเพย์
  const BANK_ACCOUNT  = "235-1-83876-3";   // เลขบัญชี KBANK

  let currentUser = null;
  let allEvents   = [];
  let currentPayment = null;
  let publicDataFetched = false;

  // ─── INITIALIZATION ───
  document.addEventListener('DOMContentLoaded', () => {
    if (window.MAINTENANCE_CONFIG && window.MAINTENANCE_CONFIG.enabled) {
      const rawUser = sessionStorage.getItem('loggedInUser');
      const userObj = rawUser ? JSON.parse(rawUser) : null;
      if (!userObj || userObj.role !== 'Admin') {
        location.href = 'index.html';
        return;
      }
    }

    const raw = sessionStorage.getItem('loggedInUser');
    if (!raw) { location.href = 'index.html'; return; }
    currentUser = JSON.parse(raw);

    // Fetch latest user profile / theme from database in background
    if (window.myAppDb && currentUser.email) {
      window.myAppDb.from('users').select('theme').eq('email', currentUser.email).maybeSingle().then(({ data }) => {
        if (data && data.theme && data.theme !== localStorage.getItem('bec_app_theme')) {
          currentUser.theme = data.theme;
          sessionStorage.setItem('loggedInUser', JSON.stringify(currentUser));
          applyTheme(data.theme, false);
        }
      }).catch(err => console.warn('Background theme sync:', err));
    }

    if (currentUser.role === 'Admin') {
      location.href = 'admin_dashboard.html'; return;
    }

    const initial = (currentUser.name || 'U')[0].toUpperCase();
    const pic = currentUser.picture || '';

    // Header profile pill (Cute Kuromi avatar)
    const navAv = document.getElementById('navAvatar');
    if (navAv) {
      navAv.innerHTML = `<img src="assets/kuromi_avatar.png?v=3" alt="Kuromi">`;
    }
    const navName = document.getElementById('navName');
    if (navName) navName.textContent = currentUser.name || 'นิสิต';

    // Virtual Card profile details
    const cardName = document.getElementById('cardHolderName');
    if (cardName) cardName.textContent = currentUser.name || 'นิสิตสาขาบริหารธุรกิจ';
    const cardSub = document.getElementById('cardHolderSub');
    if (cardSub) {
      cardSub.textContent = currentUser.email || '';
    }

    // 8-digit Student ID on the card
    let stId = '69340000';
    if (currentUser.studentId) {
      const cleanId = String(currentUser.studentId).trim();
      if (cleanId) stId = cleanId;
    }
    const embossedEl = document.getElementById('cardEmbossedDigits');
    if (embossedEl) {
      embossedEl.textContent = stId;
    }

    // Initialize 3D Card tilt and sheen
    initCard3D();

    // Keep hidden element IDs intact for backward compatibility
    const heroAv = document.getElementById('heroAvatar');
    if (heroAv) heroAv.innerHTML = pic ? `<img src="${pic}" alt="">` : initial;
    const heroName = document.getElementById('heroName');
    if (heroName) heroName.textContent = currentUser.name || '—';
    const heroBio = document.getElementById('heroBio');
    if (heroBio) heroBio.textContent = `${currentUser.studentId ? currentUser.studentId + ' · ' : ''}${currentUser.email || ''}`;

    fetchPayments();
    fetchPublicBoard();
  });

  // ─── SWITCH MAIN VIEW ───
  function switchMainView(view, el) {
    document.querySelectorAll('#mainTabsBar .seg-tab-btn, #mainTabsBar .tab-pill').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    
    const vPayments = document.getElementById('view-my-payments');
    const vPublic = document.getElementById('view-public-board');
    if (vPayments) vPayments.style.display = view === 'my-payments' ? 'block' : 'none';
    if (vPublic) vPublic.style.display = view === 'public-board' ? 'block' : 'none';
    if (view === 'public-board') fetchPublicBoard();
  }

  // ─── RENDER PUBLIC BOARD ───
  function renderPublicBoard(data) {
    const fmt = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Income rows
    const incomeRows = (data.incomes && data.incomes.length > 0)
      ? data.incomes.map(e => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.85rem 1rem;border-bottom:1px solid var(--border);font-size:0.82rem">
            <div>
              <div style="color:var(--text);font-weight:700">${e.source}</div>
              <div style="color:var(--muted);font-size:0.72rem;margin-top:2px">
                ${new Date(e.date).toLocaleDateString('th-TH')}
              </div>
              ${e.receiptUrl ? `
                <a href="${e.receiptUrl}" target="_blank" rel="noopener noreferrer" class="btn-receipt-view" title="เปิดดูหลักฐาน">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  <span>ดูหลักฐาน</span>
                </a>` : ''}
            </div>
            <div style="color:var(--success);font-weight:800;font-variant-numeric:tabular-nums;font-size:0.95rem">฿${fmt(e.amount)}</div>
          </div>`).join('')
      : `<div style="font-size:0.8rem;color:var(--muted);padding:1rem;text-align:center">ไม่มีรายการรายรับ</div>`;

    // Expense rows
    const expenseRows = (data.expenses && data.expenses.length > 0)
      ? data.expenses.map(e => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.85rem 1rem;border-bottom:1px solid var(--border);font-size:0.82rem">
            <div>
              <div style="color:var(--text);font-weight:700">${e.title}</div>
              <div style="color:var(--muted);font-size:0.72rem;margin-top:2px">
                ${new Date(e.date).toLocaleDateString('th-TH')}
              </div>
              ${e.receiptUrl ? `
                <a href="${e.receiptUrl}" target="_blank" rel="noopener noreferrer" class="btn-receipt-view" title="เปิดดูหลักฐาน">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  <span>ดูหลักฐาน</span>
                </a>` : ''}
            </div>
            <div style="color:var(--danger);font-weight:800;font-variant-numeric:tabular-nums;font-size:0.95rem">฿${fmt(e.amount)}</div>
          </div>`).join('')
      : `<div style="font-size:0.8rem;color:var(--muted);padding:1rem;text-align:center">ไม่มีรายการใช้จ่าย</div>`;

    // Matrix rows
    const matrixHtml = `
      <div class="matrix-scroll-wrap">
        <table class="matrix-table">
          <thead>
            <tr>
              ${data.matrixHeaders.map((h, i) => `<th style="text-align:${i > 1 ? 'center' : 'left'}">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.matrixRows.map(row => `
              <tr class="pb-matrix-row">
                ${data.matrixHeaders.map((h, i) => {
                  let val = row[h] || '-';
                  if (i > 1) {
                    if (val === 'Pending' || val === 'รอตรวจสอบ') return `<td style="color:#b45309;font-weight:700;text-align:center">รอตรวจสอบ</td>`;
                    if (val === '-' || val === '' || val === 'ค้างชำระ') return `<td style="color:#dc2626;font-weight:700;text-align:center">ค้างชำระ</td>`;
                    if (!isNaN(val)) return `<td style="color:#15803d;font-weight:700;text-align:center;font-variant-numeric:tabular-nums">฿${fmt(val)}</td>`;
                  }
                  return `<td style="color:var(--text);">${val}</td>`;
                }).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    let html = `
      <!-- Treasury Statement Card -->
      <div class="treasury-card">
        <div class="treasury-caption">ยอดเงินสาขาคงเหลือสุทธิ</div>
        <div class="treasury-total-val">฿${fmt(data.totalBalance)}</div>
      </div>

      <!-- Segmented Sub-tabs -->
      <div class="public-subtab-row">
        <button id="pbTab-finance" class="public-subtab-btn active" onclick="switchPbTab('finance')">
          รายการบัญชี รับ-จ่าย
        </button>
        <button id="pbTab-matrix" class="public-subtab-btn" onclick="switchPbTab('matrix')">
          สถานะชำระเงินของนิสิต
        </button>
      </div>

      <!-- Panel: รายการบัญชี รับ-จ่าย -->
      <div id="pbPanel-finance">
        <div style="background:#ffffff;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:1rem;">
          <div style="padding:0.75rem 1rem;background:var(--surface-sub);border-bottom:1px solid var(--border);font-size:0.75rem;font-weight:700;color:var(--success);text-transform:uppercase;letter-spacing:0.04em;">
            รายรับ 
          </div>
          ${incomeRows}
        </div>

        <div style="background:#ffffff;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;">
          <div style="padding:0.75rem 1rem;background:var(--surface-sub);border-bottom:1px solid var(--border);font-size:0.75rem;font-weight:700;color:var(--danger);text-transform:uppercase;letter-spacing:0.04em;">
            รายจ่าย 
          </div>
          ${expenseRows}
        </div>
      </div>

      <!-- Panel: ตารางสถานะนิสิต -->
      <div id="pbPanel-matrix" style="display:none">
        <div class="matrix-search-box">
          <svg class="matrix-search-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" id="pbMatrixSearch" class="matrix-search-input" onkeyup="filterPbMatrix()" placeholder="ค้นหารหัสนิสิต หรือ ชื่อ-นามสกุล..." />
        </div>
        ${matrixHtml}
      </div>
    `;

    const container = document.getElementById('publicBoardContent');
    if (container) container.innerHTML = html;
  }

  function switchPbTab(tab) {
    const isFinance = tab === 'finance';
    const panelFinance = document.getElementById('pbPanel-finance');
    const panelMatrix = document.getElementById('pbPanel-matrix');
    if (panelFinance) panelFinance.style.display = isFinance ? 'block' : 'none';
    if (panelMatrix) panelMatrix.style.display = isFinance ? 'none' : 'block';
    
    const tabF = document.getElementById('pbTab-finance');
    const tabM = document.getElementById('pbTab-matrix');
    
    if (tabF && tabM) {
      if (isFinance) {
        tabF.classList.add('active');
        tabM.classList.remove('active');
      } else {
        tabM.classList.add('active');
        tabF.classList.remove('active');
      }
    }
  }

  // ─── FETCH PAYMENTS (Supabase Native) ───
  async function fetchPayments() {
    try {
      const { data: eventsData, error: evErr } = await window.myAppDb
        .from('events')
        .select('*');
      if (evErr) throw evErr;

      const { data: payData, error: payErr } = await window.myAppDb
        .from('payments')
        .select('*')
        .eq('student_email', currentUser.email);
      if (payErr) throw payErr;

      const payMap = {};
      (payData || []).forEach(d => {
        if (!payMap[d.event_id] || d.status === 'Paid') {
          payMap[d.event_id] = d;
        }
      });

      const currentDate = new Date();
      allEvents = (eventsData || []).map(ev => {
        const payRecord = payMap[ev.id];
        const dueDate = new Date(ev.due_date);
        let status = 'Unpaid';
        if (payRecord) status = payRecord.status;

        let penalty = 0;
        if (status === 'Unpaid' && currentDate > dueDate) {
          const diffDays = Math.floor(Math.abs(currentDate - dueDate) / (1000 * 60 * 60 * 24));
          penalty = diffDays * 1;
          
          const t = (ev.title || '').trim();
          if (t === 'สัปดาห์ที่ 1' || t === 'สัปดาห์ที่ 2' || t === 'สัปดาห์ที่ 3' || t === 'สัปดาห์ที่ 4') {
            penalty = 0;
          }
        }

        return {
          eventId: ev.id,
          title: ev.title,
          baseAmount: Number(ev.base_amount),
          dueDate: ev.due_date,
          status,
          penalty,
          totalAmount: Number(ev.base_amount) + penalty
        };
      }).sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

      const unpaid = allEvents.filter(e => e.status === 'Unpaid').length;
      const heroEl = document.getElementById('heroUnpaidCount');
      if (heroEl) heroEl.textContent = unpaid;

      // Update card status badge
      const statusBadge = document.getElementById('cardStatusBadge');
      const statusText = document.getElementById('cardStatusText');
      if (statusBadge && statusText) {
        const dot = statusBadge.querySelector('.pulse-dot');
        if (unpaid === 0) {
          statusText.textContent = 'ชำระครบถ้วนงับอ้วร ✓';
          if (dot) dot.classList.remove('pulse-amber');
        } else {
          statusText.textContent = `ค้างชำระน้าเตง ${unpaid} รายการ`;
          if (dot) dot.classList.add('pulse-amber');
        }
      }
      renderList(allEvents);
    } catch (e) {
      console.error('Error loading events:', e);
      renderList([]);
    }
  }

  // ─── FETCH PUBLIC BOARD (Dynamic Live On-the-fly Calculation) ───
  async function fetchPublicBoard() {
    try {
      const [statsRes, incRes, expRes, usersRes, evRes, payRes] = await Promise.all([
        window.myAppDb.from('system_stats').select('*').eq('id', 'overview').maybeSingle(),
        window.myAppDb.from('incomes').select('*').order('created_at', { ascending: false }).limit(20),
        window.myAppDb.from('expenses').select('*').order('created_at', { ascending: false }).limit(20),
        window.myAppDb.from('users').select('*').eq('role', 'Student'),
        window.myAppDb.from('events').select('*'),
        window.myAppDb.from('payments').select('*')
      ]);

      const stats = statsRes.data || {};
      const totalBalance = stats.total_balance != null ? Number(stats.total_balance) : 0;
      const totalIncome  = stats.total_income != null ? (Number(stats.total_income) + (Number(stats.total_paid_payments) || 0)) : 0;
      const totalExpense = stats.total_expense != null ? Number(stats.total_expense) : 0;

      const incomes = (incRes.data || []).map(d => ({
        ...d,
        receiptUrl: d.receipt_url,
        timestamp: d.timestamp || d.created_at
      }));
      const expenses = (expRes.data || []).map(d => ({
        ...d,
        receiptUrl: d.receipt_url,
        timestamp: d.timestamp || d.created_at
      }));

      // Dynamic On-the-fly Matrix Calculation
      const students = (usersRes.data || []).map(d => ({
        studentId: d.student_id || d.studentId,
        name: d.name,
        email: d.email
      }));
      const events = (evRes.data || []).map(d => ({
        id: d.id,
        eventId: d.id,
        title: d.title,
        baseAmount: d.base_amount != null ? d.base_amount : d.baseAmount,
        dueDate: d.due_date || d.dueDate,
        createdAt: d.created_at || d.createdAt
      }));
      const payments = (payRes.data || []).map(d => ({
        paymentId: d.id,
        name: d.student_name || d.name,
        email: d.student_email || d.email,
        studentId: d.student_id || d.studentId,
        paidAmount: d.paid_amount != null ? d.paid_amount : d.paidAmount,
        totalAmount: d.total_amount != null ? d.total_amount : d.totalAmount,
        eventTitle: d.event_title || d.eventTitle,
        eventId: d.event_id || d.eventId,
        status: d.status
      }));

      events.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      students.sort((a, b) => (a.studentId || '').localeCompare(b.studentId || '', undefined, { numeric: true }));

      let matrixHeaders = ['รหัสนิสิต', 'ชื่อ-สกุล'];
      events.forEach(ev => matrixHeaders.push(ev.title || 'รอบเก็บเงิน'));

      let matrixRows = students.map(stu => {
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

      publicDataFetched = true;
      renderPublicBoard({ incomes, expenses, totalIncome, totalExpense, totalBalance, matrixHeaders, matrixRows });
    } catch (e) {
      console.error('fetchPublicBoard Error:', e);
      const pbEl = document.getElementById('publicBoardContent');
      if (pbEl) {
        pbEl.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">เชื่อมต่อล้มเหลว</p></div>`;
      }
    }
  }

  // ─── RENDER PAYMENT STATEMENT LIST ───
  function renderList(items) {
    const container = document.getElementById('paymentList');
    const countEl = document.getElementById('statementCount');
    if (countEl) countEl.textContent = `${items.length} รายการ`;

    if (!items.length) {
      container.innerHTML = `
        <div class="empty-state">
          <img src="assets/kuromi_avatar.png" class="empty-state-avatar" alt="Kuromi" />
          <p>ไม่มีรายการในหมวดนี้</p>
          <small>เมื่อมีรอบเก็บเงินใหม่ รายการจะปรากฏขึ้นที่นี่โดยอัตโนมัติ</small>
        </div>`;
      return;
    }

    container.innerHTML = items.map(ev => {
      const isUnpaid  = ev.status === 'Unpaid';
      const isPending = ev.status === 'Pending';
      const isPaid    = ev.status === 'Paid';

      const badgeClass = isUnpaid ? 'unpaid' : isPending ? 'pending' : 'paid';
      const badgeText  = isUnpaid ? 'ค้างชำระ' : isPending ? 'รอตรวจสอบ' : 'ชำระแล้ว';
      const dueStr     = new Date(ev.dueDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });

      return `
        <div class="statement-card">
          <div class="statement-row-top">
            <div class="statement-info">
              <div class="statement-title">${ev.title}</div>
              <div class="statement-meta">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>ครบกำหนด ${dueStr}</span>
              </div>
              ${ev.penalty > 0 ? `<div class="penalty-pill">+ ค่าปรับ ฿${ev.penalty} (เกินกำหนด)</div>` : ''}
            </div>
            <div class="statement-amount-box">
              <div class="statement-amount">฿${Number(ev.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              ${ev.penalty > 0 ? `<div class="statement-base-label">ยอดปกติ ฿${Number(ev.baseAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
            </div>
          </div>

          <div class="statement-divider"></div>

          <div class="statement-row-bottom">
            <span class="status-badge ${badgeClass}">${badgeText}</span>
            ${isUnpaid ? `
              <button class="btn btn-pay-now" onclick="openModal('${ev.eventId}', '${ev.title.replace(/'/g, "\\'")}', ${ev.totalAmount}, ${ev.penalty})">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ชำระเงิน
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  function filterItems(status, el) {
    document.querySelectorAll('#filterTabsBar .pill-btn, #filterTabsBar .tab-pill').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const list = status === 'all' ? allEvents : allEvents.filter(e => e.status === status);
    renderList(list);
  }

  function showError(msg) {
    const list = document.getElementById('paymentList');
    if (list) {
      list.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">${msg}</p></div>`;
    }
  }

  // ─── PROMPTPAY PAYLOAD GENERATOR ───
  function generatePromptPayPayload(id, amount) {
    const f = (tag, val) => {
      val = val.toString();
      return tag + ('00' + val.length).slice(-2) + val;
    };

    let targetId = id.replace(/\D/g, '');
    let isPhone = targetId.length === 10;
    if (isPhone) {
      targetId = '0066' + targetId.substring(1);
    }

    const aid = f('00', 'A000000677010111');
    const biller = isPhone ? f('01', targetId) : f('02', targetId);
    const merchantInfo = f('29', aid + biller);
    const amountStr = amount ? f('54', Number(amount).toFixed(2)) : '';

    const payload = [
      f('00', '01'),
      f('01', amount ? '12' : '11'),
      merchantInfo,
      f('58', 'TH'),
      f('53', '764'),
      amountStr,
      '6304'
    ].join('');

    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
      }
    }
    return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  }

  // ─── BOTTOM SHEET PAYMENT MODAL ───
  function openModal(eventId, title, totalAmount, penalty) {
    currentPayment = { eventId, title, totalAmount, penalty };
    document.getElementById('modalTitle').textContent  = title;
    document.getElementById('modalAmount').textContent = `฿${Number(totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const penEl = document.getElementById('modalPenalty');
    if (penalty > 0) {
      penEl.textContent = `รวมค่าปรับล่าช้า ฿${penalty}`;
      penEl.style.display = 'inline-block';
    } else {
      penEl.style.display = 'none';
    }

    // QR PromptPay
    const qrDiv = document.getElementById('qrcode');
    qrDiv.innerHTML = '';
    try {
      const payload = generatePromptPayPayload(PROMPTPAY_ID, totalAmount);
      new QRCode(qrDiv, {
        text: payload,
        width: 180,
        height: 180,
        colorDark: '#1f142b',
        colorLight: '#ffffff',
        correctLevel: (typeof QRCode !== 'undefined' && QRCode.CorrectLevel) ? QRCode.CorrectLevel.M : 0
      });
      document.getElementById('qrLabel').textContent = `PromptPay · ฿${Number(totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // Remove default qrcodejs native tooltip
      setTimeout(() => {
        qrDiv.removeAttribute('title');
        const img = qrDiv.querySelector('img');
        const cvs = qrDiv.querySelector('canvas');
        if (img) img.removeAttribute('title');
        if (cvs) cvs.removeAttribute('title');
      }, 50);
    } catch(e) {
      console.error(e);
      qrDiv.innerHTML = '<div style="width:180px;height:180px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#999;">QR ไม่พร้อมใช้งาน</div>';
    }

    // Reset upload & view
    resetUploadDropzone();
    document.getElementById('modalContent').style.display = 'block';
    document.getElementById('successState').style.display = 'none';
    const subBtn = document.getElementById('submitBtn');
    subBtn.disabled = false;
    subBtn.textContent = 'ยืนยันการชำระเงิน';

    document.getElementById('paymentModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(updateVintageNewspaperAlignment, 50);
    setTimeout(updateVintageNewspaperAlignment, 200);
  }

  function updateVintageNewspaperAlignment() {
    const card1 = document.querySelector('.qr-formal-card');
    const card2 = document.querySelector('.slip-upload-dropzone');
    if (card1 && card2) {
      const offset = card2.offsetTop - card1.offsetTop;
      const width = card1.offsetWidth;
      if (offset > 0 && width > 0) {
        card2.style.setProperty('--newspaper-offset', `-${offset}px`);
        card2.style.setProperty('--newspaper-width', `${width}px`);
      }
    }
  }
  window.addEventListener('resize', updateVintageNewspaperAlignment);

  function copyBankAccount(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    navigator.clipboard.writeText(BANK_ACCOUNT).then(() => {
      showToast('คัดลอกเลขบัญชี 235-1-83876-3 แล้ว ✓');
    }).catch(() => alert('235-1-83876-3'));
  }

  // ─── VIRTUAL EXECUTIVE CARD (STATIC REALISTIC FINISH) ───
  function initCard3D() {
    // Mouse movement / tilt disabled per user preference for authentic physical card stability
  }

  function closeModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
    currentPayment = null;
    resetUploadDropzone();
    closeSlipLightbox(null, true);
  }

  function resetUploadDropzone() {
    const prompt = document.getElementById('uploadPrompt');
    const attached = document.getElementById('uploadAttached');
    const dropzone = document.getElementById('uploadArea');
    const filename = document.getElementById('uploadFilename');
    const input = document.getElementById('slipInput');
    const thumb = document.getElementById('slipThumbPreview');
    const lbImg = document.getElementById('slipLightboxImg');
    
    if (input) input.value = '';
    if (filename) filename.textContent = '';
    if (thumb) thumb.src = '';
    if (lbImg) lbImg.src = '';
    if (prompt) prompt.style.display = 'block';
    if (attached) attached.style.display = 'none';
    if (dropzone) dropzone.classList.remove('has-file');
  }

  function onFileSelect(input) {
    const file = input.files && input.files[0];
    const prompt = document.getElementById('uploadPrompt');
    const attached = document.getElementById('uploadAttached');
    const dropzone = document.getElementById('uploadArea');
    const filename = document.getElementById('uploadFilename');
    const thumb = document.getElementById('slipThumbPreview');
    const lbImg = document.getElementById('slipLightboxImg');

    if (file) {
      if (filename) filename.textContent = file.name;
      const previewUrl = URL.createObjectURL(file);
      if (thumb) thumb.src = previewUrl;
      if (lbImg) lbImg.src = previewUrl;

      if (prompt) prompt.style.display = 'none';
      if (attached) attached.style.display = 'flex';
      if (dropzone) dropzone.classList.add('has-file');
    } else {
      resetUploadDropzone();
    }
    setTimeout(updateVintageNewspaperAlignment, 30);
  }

  window.openSlipLightbox = function(e) {
    if (e) e.stopPropagation();
    const lb = document.getElementById('slipLightbox');
    if (lb) lb.classList.add('active');
  };

  window.closeSlipLightbox = function(e, force = false) {
    if (!force && e && e.target && e.target.tagName === 'IMG') return;
    const lb = document.getElementById('slipLightbox');
    if (lb) lb.classList.remove('active');
  };

  window.reselectSlipFile = function(e) {
    if (e) e.stopPropagation();
    const input = document.getElementById('slipInput');
    if (input) input.click();
  };

  window.removeSelectedSlip = function(e) {
    if (e) e.stopPropagation();
    resetUploadDropzone();
  };

  // ─── SUBMIT SLIP ───
  async function submitSlip() {
    const fileInput = document.getElementById('slipInput');
    if (!fileInput.files.length) {
      alert('กรุณาแนบรูปภาพสลิปโอนเงินก่อนยืนยัน');
      return;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".3"/><path d="M21 12a9 9 0 00-9-9"/></svg> กำลังอัปโหลด...`;

    try {
      const file = fileInput.files[0];
      
      // Image Compression & Base64 Generation
      const { compressedBlob, base64Url } = await new Promise((resolve, reject) => {
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
            const base64Url = canvas.toDataURL('image/jpeg', 0.72);
            canvas.toBlob((blob) => resolve({ compressedBlob: blob, base64Url }), 'image/jpeg', 0.72);
          };
          img.onerror = reject;
        };
        reader.onerror = reject;
      });

      // 1. Upload to Supabase Storage
      const paymentId = crypto.randomUUID();
      const fileName = `${currentPayment.eventId}/slip_${paymentId}.jpg`;
      let slipUrl = null;

      try {
        const { data: uploadData, error: uploadError } = await window.myAppDb.storage
          .from('slips')
          .upload(fileName, compressedBlob, { contentType: 'image/jpeg', upsert: true });

        if (uploadError || !uploadData) {
          throw new Error('อัปโหลดไฟล์สลิปไม่สำเร็จ กรุณาตรวจสอบสัญญาณเน็ตแล้วลองใหม่อีกครั้ง (' + (uploadError?.message || 'Storage error') + ')');
        }

        const { data: { publicUrl } } = window.myAppDb.storage.from('slips').getPublicUrl(fileName);
        if (!publicUrl) {
          throw new Error('ไม่สามารถสร้างลิงก์รูปภาพสลิปได้ กรุณาลองใหม่อีกครั้ง');
        }
        slipUrl = publicUrl;
      } catch (storageErr) {
        console.error('Storage upload error:', storageErr);
        throw storageErr;
      }

      // 2. Ensure user exists in users table (to satisfy foreign key constraint)
      try {
        await window.myAppDb.from('users').upsert({
          email: currentUser.email,
          name: currentUser.name || 'นิสิตทดสอบระบบ',
          role: currentUser.role || 'Student',
          student_id: currentUser.studentId || ''
        }, { onConflict: 'email' });
      } catch (userUpsertErr) {
        console.warn('User upsert check:', userUpsertErr);
      }

      // 3. Write to Payments table (Supabase Native)
      try {
        let realName = currentUser.name || '';
        try {
          const { data: uData } = await window.myAppDb
            .from('users')
            .select('name')
            .eq('email', currentUser.email)
            .maybeSingle();
          if (uData && uData.name) {
            realName = uData.name;
            currentUser.name = realName;
            sessionStorage.setItem('loggedInUser', JSON.stringify(currentUser));
          }
        } catch(e) { console.error(e); }

        const { error: payErr } = await window.myAppDb
          .from('payments')
          .upsert({
            id: paymentId,
            event_id: currentPayment.eventId,
            event_title: currentPayment.title,
            student_email: currentUser.email,
            student_name: realName,
            paid_amount: currentPayment.totalAmount,
            penalty: currentPayment.penalty,
            status: 'Pending',
            slip_url: slipUrl,
            paid_at: new Date().toISOString()
          });
        if (payErr) throw payErr;

      } catch (dbError) {
        console.error("Supabase Error:", dbError);
        throw new Error('บันทึกข้อมูลฐานข้อมูลไม่สำเร็จ: ' + dbError.message);
      }

      document.getElementById('modalContent').style.display = 'none';
      document.getElementById('successState').style.display = 'block';
      fetchPayments();
      fetchPublicBoard();
    } catch (e) {
      console.error(e);
      alert('อัปโหลดไม่สำเร็จ: ' + e.message);
      btn.disabled = false;
      btn.textContent = 'ยืนยันการชำระเงิน';
    }
  }

  // Toast helper with instant theme color adaptation
  function showToast(msg, targetTheme = null) {
    let t = document.getElementById('appToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'appToast';
      document.body.appendChild(t);
    }

    const activeTheme = targetTheme || document.documentElement.getAttribute('data-theme') || (currentUser && currentUser.theme) || 'kuromi';

    // Theme style mapping for instant visual update
    const themeStyles = {
      kuromi: {
        bg: 'linear-gradient(135deg, #1e112a, #2a163d)',
        color: '#ffffff',
        border: '1px solid rgba(244, 114, 182, 0.45)',
        shadow: '0 10px 25px rgba(30, 17, 42, 0.45)'
      },
      vintage: {
        bg: 'linear-gradient(135deg, #432818, #2a180e)',
        color: '#fdf6ec',
        border: '1px solid rgba(212, 175, 115, 0.55)',
        shadow: '0 10px 25px rgba(42, 24, 14, 0.45)'
      },
      minecraft: {
        bg: 'linear-gradient(135deg, #1b381e, #0f2411)',
        color: '#f0fdf4',
        border: '1.5px solid #4ade80',
        shadow: '0 10px 25px rgba(15, 36, 17, 0.45)'
      },
      black: {
        bg: 'linear-gradient(135deg, #18181b, #09090b)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.28)',
        shadow: '0 10px 28px rgba(0, 0, 0, 0.85)'
      }
    };

    const s = themeStyles[activeTheme] || themeStyles.kuromi;
    t.className = `theme-${activeTheme}`;
    t.style.background = s.bg;
    t.style.color = s.color;
    t.style.border = s.border;
    t.style.boxShadow = s.shadow;

    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';

    if (t.toastTimer) clearTimeout(t.toastTimer);
    t.toastTimer = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2400);
  }

  // ─── SETTINGS DROPDOWN POPUP MENU ───
  function toggleSettingsMenu(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('settingsDropdown');
    const btn = document.getElementById('btnSettingsMenu');
    if (!dropdown) return;
    
    // Dismiss promo bubble when user opens settings
    dismissThemePromo();

    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
      closeSettingsMenu();
    } else {
      dropdown.classList.add('open');
      if (btn) btn.classList.add('active');
    }
  }

  function closeSettingsMenu() {
    const dropdown = document.getElementById('settingsDropdown');
    const btn = document.getElementById('btnSettingsMenu');
    if (dropdown) dropdown.classList.remove('open');
    if (btn) btn.classList.remove('active');
  }

  // Click outside to close settings menu
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('settingsDropdown');
    const btn = document.getElementById('btnSettingsMenu');
    if (!dropdown || !dropdown.classList.contains('open')) return;
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
      closeSettingsMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettingsMenu();
  });

  // ─── THEME PROMO BUBBLE (OPTION 2) ───
  function initThemePromo() {
    const isDismissed = sessionStorage.getItem('bec_theme_promo_dismissed') === 'true';
    const currentTheme = localStorage.getItem('bec_app_theme') || 'black';
    const promoBubble = document.getElementById('themePromoBubble');
    const newBadge = document.getElementById('gearNewBadge');

    // Only show if never dismissed during this login session and currently on Classic Black theme
    if (!isDismissed && currentTheme === 'black') {
      if (promoBubble) {
        promoBubble.style.display = 'block';
        promoBubble.style.opacity = '1';
        promoBubble.style.transform = 'translateY(0)';
      }
      if (newBadge) {
        newBadge.style.display = 'inline-block';
        newBadge.style.opacity = '1';
      }
    } else {
      if (promoBubble) promoBubble.style.display = 'none';
      if (newBadge) newBadge.style.display = 'none';
    }
  }

  function dismissThemePromo(e) {
    if (e) e.stopPropagation();
    // Once user clicks gear icon or dismisses, remember in sessionStorage for this login session
    sessionStorage.setItem('bec_theme_promo_dismissed', 'true');
    const promoBubble = document.getElementById('themePromoBubble');
    const newBadge = document.getElementById('gearNewBadge');
    if (promoBubble) {
      promoBubble.style.opacity = '0';
      promoBubble.style.transform = 'translateY(-6px)';
      setTimeout(() => { promoBubble.style.display = 'none'; }, 200);
    }
    if (newBadge) {
      newBadge.style.opacity = '0';
      setTimeout(() => { newBadge.style.display = 'none'; }, 200);
    }
  }

  function openThemeFromBubble(e) {
    if (e) e.stopPropagation();
    dismissThemePromo();
    onOpenThemeCustomizer();
  }

  // ─── THEME MANAGER (BLACK, KUROMI, VINTAGE & MINECRAFT) ───
  function initTheme() {
    let savedTheme = 'black';
    if (currentUser && currentUser.theme) {
      savedTheme = currentUser.theme;
      localStorage.setItem('bec_app_theme', savedTheme);
    } else {
      if (!localStorage.getItem('bec_theme_v2_initialized')) {
        localStorage.setItem('bec_app_theme', 'black');
        localStorage.setItem('bec_theme_v2_initialized', 'true');
      }
      savedTheme = localStorage.getItem('bec_app_theme') || 'black';
    }
    applyTheme(savedTheme, false);
    initThemePromo();
  }

  function updateDashboardBlackCard(theme) {
    const canvas = document.getElementById('dashboardCardDotCanvas');
    if (canvas) canvas.style.display = 'none';
  }

  function applyTheme(theme, showNotice = true) {
    if (theme !== 'black' && theme !== 'kuromi' && theme !== 'vintage' && theme !== 'minecraft') theme = 'black';
    localStorage.setItem('bec_app_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    updateDashboardBlackCard(theme);

    if (theme === 'black') {
      initThemePromo();
    } else {
      const promoBubble = document.getElementById('themePromoBubble');
      const newBadge = document.getElementById('gearNewBadge');
      if (promoBubble) promoBubble.style.display = 'none';
      if (newBadge) newBadge.style.display = 'none';
    }

    const checkK = document.getElementById('checkKuromi');
    const checkV = document.getElementById('checkVintage');
    const checkM = document.getElementById('checkMinecraft');
    const checkB = document.getElementById('checkBlack');
    const optK = document.getElementById('themeOptKuromi');
    const optV = document.getElementById('themeOptVintage');
    const optM = document.getElementById('themeOptMinecraft');
    const optB = document.getElementById('themeOptBlack');

    if (optK) optK.classList.toggle('active', theme === 'kuromi');
    if (optV) optV.classList.toggle('active', theme === 'vintage');
    if (optM) optM.classList.toggle('active', theme === 'minecraft');
    if (optB) optB.classList.toggle('active', theme === 'black');

    if (checkK) checkK.style.display = (theme === 'kuromi') ? 'flex' : 'none';
    if (checkV) checkV.style.display = (theme === 'vintage') ? 'flex' : 'none';
    if (checkM) checkM.style.display = (theme === 'minecraft') ? 'flex' : 'none';
    if (checkB) checkB.style.display = (theme === 'black') ? 'flex' : 'none';

    if (showNotice) {
      let name = 'คลาสสิคแบล็ค';
      if (theme === 'kuromi') name = 'คุโรมิ';
      else if (theme === 'vintage') name = 'หนังสือพิมพ์วินเทจ';
      else if (theme === 'minecraft') name = 'มายคราฟ';
      showToast(`เปลี่ยนเป็นธีม ${name} เรียบร้อยแล้ว`, theme);
    }
  }

  // ป้องกันการสลับเล่นรัวๆ ด้วย Debounce และอัปเดตลงคอลัมน์ theme แถวเดียว ไม่บันทึกซ้ำซ้อน
  let themeDebounceTimer = null;
  function saveUserThemeToDatabase(theme) {
    if (!currentUser || !currentUser.email) return;

    currentUser.theme = theme;
    sessionStorage.setItem('loggedInUser', JSON.stringify(currentUser));

    clearTimeout(themeDebounceTimer);
    themeDebounceTimer = setTimeout(async () => {
      try {
        if (window.myAppDb) {
          const { error } = await window.myAppDb
            .from('users')
            .update({ theme: theme })
            .eq('email', currentUser.email);

          if (error) {
            console.warn('Could not sync theme to database:', error.message);
          } else {
            console.log('✓ Theme synced to database:', theme);
          }
        }
      } catch (err) {
        console.warn('Theme sync error:', err);
      }
    }, 600); // 600ms debounce
  }

  function selectTheme(theme) {
    applyTheme(theme, true);
    saveUserThemeToDatabase(theme);
    setTimeout(() => {
      closeThemeModal();
    }, 180);
  }

  function onOpenThemeCustomizer() {
    closeSettingsMenu();
    const modal = document.getElementById('themeModalBackdrop');
    if (modal) {
      modal.classList.add('open');
      const current = localStorage.getItem('bec_app_theme') || 'black';
      applyTheme(current, false);
    }
  }

  function closeThemeModal() {
    const modal = document.getElementById('themeModalBackdrop');
    if (modal) modal.classList.remove('open');
  }

  // Apply theme immediately on load
  initTheme();

  async function logout() {
    if (window.myAppDb && window.myAppDb.auth) {
      await window.myAppDb.auth.signOut();
    }
    sessionStorage.removeItem('loggedInUser');
    sessionStorage.removeItem('bec_theme_promo_dismissed');
    location.href = 'index.html';
  }

  document.getElementById('paymentModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  window.filterPbMatrix = function() {
    const term = (document.getElementById('pbMatrixSearch').value || '').toLowerCase();
    const rows = document.querySelectorAll('.pb-matrix-row');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    });
  };
