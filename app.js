// ==================== v1 升级说明 ====================
// 1. 基准效率/上限效率/预测区间 可在页面上配置（默认 93/97/93.2/96.8，与原版一致）
// 2. 开机/关机时间旁新增「现在」按钮，一键填充当前时间
// 3. 灌装记录新增：清空全部（带确认）、复制到剪贴板、记录条数统计
// 4. 记录输入框按回车可直接添加
// 5. 顶部显示当前日期时间
// 原有计算逻辑与记录功能保持不变
// ==================== v2 升级说明 ====================
// 1. 额定能力改为组合输入框：可下拉选择预设（24000/36000/72000/60000/90000/30000），
//    也可手动输入任意值，手动输入范围限制 10000~150000
// 2. UI 重排：开机/关机时间（日期+时分秒）一行；改型时间一行；
//    额定能力+灌装数量一行；剔除时间下一行占半行
// ==================== v3 升级说明 ====================
// 1. 额定能力改为「预设下拉 + 自行输入」切换：下拉含 6 个预设 + 「自行输入…」选项，
//    选择「自行输入…」后隐藏预设下拉，只显示输入框（范围 10000~150000），不再遮挡输入框
// 2. 最后一段：额定能力、灌装数量、剔除时间、剩余可灌装数量 各占一行
// 3. 参数设置收进弹层卡片：页面只保留「⚙️ 参数设置」按钮，点击弹出卡片，
//    卡片带「确认保存」/「取消」按钮，保存后写入 localStorage 持久生效
// ==================== v5 升级说明 ====================
// 日期恢复为原生日历选择器（点击弹出日历，可自由选年份），时分秒用紧凑输入框，
// 一行放得下；跨年作业场景也能正确处理
// ==================== v6 升级说明 ====================
// 追赶功能效率上下限（默认 95% / 105%）加入参数设置，可自行调整（如最高改 110%）
// ==================== v7 升级说明 ====================
// 顶部标题改为「线效率工具」；新增「实时线效计算 / 实时线效监控」双页签
// ==================== v8 升级说明（网页版） ====================
// 监控页为内嵌 iframe（leehoo.top / www.leehoo.top 同源，CSP 允许），
// 适配 Cloudflare Pages 静态部署：相对路径引用，无服务端依赖
// =====================================================

// v2/v3：额定能力预设值 + 手动输入范围（10000~150000）
const PRESET_CAPACITIES = [24000, 36000, 72000, 60000, 90000, 30000];
const CAPACITY_MIN = 10000;
const CAPACITY_MAX = 150000;
function capacityError(val) {
    if (val === null || val === undefined || String(val).trim() === '') {
        return '请填写额定能力';
    }
    const v = parseFloat(val);
    if (isNaN(v)) {
        return '额定能力格式不正确';
    }
    if (PRESET_CAPACITIES.includes(v)) {
        return null;   // 预设选项直接放行
    }
    if (v < CAPACITY_MIN || v > CAPACITY_MAX) {
        return `额定能力需为预设选项，或在 ${CAPACITY_MIN}~${CAPACITY_MAX} 之间（当前 ${v}）`;
    }
    return null;
}

// v3：额定能力「预设下拉 / 自行输入」切换
function initCapacityInput(sel, customInput, backBtn) {
    sel.addEventListener('change', function() {
        if (sel.value === '__custom__') {
            sel.style.display = 'none';
            customInput.classList.add('active');
            customInput.style.display = '';
            backBtn.style.display = '';
            customInput.focus();
        }
    });
    backBtn.addEventListener('click', function() {
        sel.style.display = '';
        customInput.classList.remove('active');
        customInput.style.display = 'none';
        backBtn.style.display = 'none';
        sel.value = '';
    });
}
// v3：取当前生效的额定能力值（自行输入模式用输入框值，否则用下拉值）
function capacityFromUI(sel, customInput) {
    return customInput.classList.contains('active') ? customInput.value : sel.value;
}

// 灌装记录相关函数
let records = JSON.parse(localStorage.getItem('filling-records')) || [];

function getCurrentTime() {
    const d = new Date();
    return `${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function saveToLocalStorage() {
    localStorage.setItem('filling-records', JSON.stringify(records));
}

// ---------- v1 新增：顶部日期显示 ----------
(function() {
    const el = document.getElementById('header-date');
    if (el) {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        el.textContent = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
})();

// ---------- v1 新增：一键填充当前时间 ----------
function fillNow(prefix) {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };
    set(prefix + '-date', `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
    set(prefix + '-hour', pad(d.getHours()));
    set(prefix + '-minute', pad(d.getMinutes()));
    set(prefix + '-second', pad(d.getSeconds()));
}

// ---------- v7/v8：计算 / 监控 页签切换 ----------
function switchView(name) {
    const isCalc = (name === 'calc');
    const calcPage = document.getElementById('page-calc');
    const monitorPage = document.getElementById('page-monitor');
    const tabCalc = document.getElementById('tab-calc');
    const tabMonitor = document.getElementById('tab-monitor');
    if (calcPage) calcPage.style.display = isCalc ? '' : 'none';
    if (monitorPage) monitorPage.style.display = isCalc ? 'none' : '';
    if (tabCalc) tabCalc.classList.toggle('active', isCalc);
    if (tabMonitor) tabMonitor.classList.toggle('active', !isCalc);
    // 监控页全屏显示：去掉内容区内边距，返回计算页时恢复
    const content = document.getElementById('content-area');
    if (content) content.style.padding = isCalc ? '' : '0px';
}


// ---------- v3：参数设置（按钮弹层 + 确认保存，localStorage 持久化） ----------
const CONFIG_KEY = 'line-eff-config';
const DEFAULT_CONFIG = { benchmark: 93, upperLimit: 97, predLow: 93.2, predHigh: 96.8, catchLow: 95, catchHigh: 105 };
function readConfig() {
    const cfg = Object.assign({}, DEFAULT_CONFIG);
    try {
        const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
        for (const k in cfg) {
            const v = parseFloat(saved[k]);
            if (!isNaN(v) && v > 0) cfg[k] = v;
        }
    } catch (e) { /* 忽略损坏数据，用默认值 */ }
    return cfg;
}

(function() {
    const openBtn = document.getElementById('open-config-btn');
    const modal = document.getElementById('config-modal');
    if (!openBtn || !modal) return;
    const FIELDS = [
        { id: 'cfg-benchmark',  key: 'benchmark',  def: 93 },
        { id: 'cfg-upper',      key: 'upperLimit', def: 97 },
        { id: 'cfg-pred-low',   key: 'predLow',    def: 93.2 },
        { id: 'cfg-pred-high',  key: 'predHigh',   def: 96.8 },
        { id: 'cfg-catch-low',  key: 'catchLow',   def: 95 },
        { id: 'cfg-catch-high', key: 'catchHigh',  def: 105 }
    ];
    // 打开：载入当前保存的参数
    openBtn.addEventListener('click', function() {
        const cur = readConfig();
        FIELDS.forEach(function(f) {
            const el = document.getElementById(f.id);
            if (el) el.value = cur[f.key];
        });
        modal.style.display = 'flex';
    });
    // 取消：关闭不保存
    document.getElementById('cfg-cancel').addEventListener('click', function() {
        modal.style.display = 'none';
    });
    // 确认保存
    document.getElementById('cfg-save').addEventListener('click', function() {
        const next = {};
        FIELDS.forEach(function(f) {
            const el = document.getElementById(f.id);
            const v = parseFloat(el ? el.value : '');
            next[f.key] = (isNaN(v) || v <= 0) ? f.def : v;
        });
        localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
        modal.style.display = 'none';
        alert('参数已保存（基准' + next.benchmark + '%、上限' + next.upperLimit + '%、预测' + next.predLow + '%~' + next.predHigh + '%、追赶' + next.catchLow + '%~' + next.catchHigh + '%）');
    });
    // 点击遮罩空白处关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
    });
})();

function addRecord() {
    const type = document.getElementById('capacity').value;
    const value = document.getElementById('value').value;
    if (!value) return;
    records.unshift({
        time: getCurrentTime(),
        type,
        value: parseInt(value)
    });
    document.getElementById('value').value = '';
    saveToLocalStorage();
    renderRecords();
    renderSummaries();
}

function deleteRecord(index) {
    records.splice(index, 1);
    saveToLocalStorage();
    renderRecords();
    renderSummaries();
}

// ---------- v1 新增：清空全部记录 ----------
function clearRecords() {
    if (records.length === 0) return;
    if (!confirm('确定要清空全部灌装记录吗？此操作不可恢复！')) return;
    records = [];
    saveToLocalStorage();
    renderRecords();
    renderSummaries();
}

// ---------- v1 新增：复制记录到剪贴板 ----------
function copyRecords() {
    if (records.length === 0) {
        alert('暂无记录可复制');
        return;
    }
    const lines = records.map((r, i) => `${i + 1}. ${r.time} - ${r.type} - ${r.value}`);
    const text = '灌装数据记录（共' + records.length + '条）：\n' + lines.join('\n');
    const done = () => alert('已复制 ' + records.length + ' 条记录到剪贴板');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
        fallbackCopy(text, done);
    }
}
function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        done();
    } catch (e) {
        alert('复制失败，请手动复制');
    }
    document.body.removeChild(ta);
}

function renderRecords() {
    const container = document.getElementById('records');
    container.innerHTML = records.map((record, index) => `
        <div class="record-item">
            <div>
                <strong>${index + 1}.</strong>
                ${record.time}-${record.type}-${record.value}
            </div>
            <button class="del-btn" onclick="deleteRecord(${index})">删除记录</button>
        </div>
    `).join('');
    // v1 新增：记录条数统计
    const countEl = document.getElementById('record-count');
    if (countEl) countEl.textContent = `共 ${records.length} 条记录`;
}

function renderSummaries() {
    const summary = records.reduce((acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + record.value;
        return acc;
    }, {});
    const container = document.getElementById('summaries');
    container.innerHTML = Object.entries(summary).map(([type, sum]) => `
        <div class="summary-item">${type}自动求和：${sum}</div>
    `).join('');
}

// 初始化灌装记录显示
renderRecords();
renderSummaries();

// v1 新增：记录输入框回车直接添加
(function() {
    const valueInput = document.getElementById('value');
    if (valueInput) {
        valueInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addRecord();
            }
        });
    }
})();

// ==================== 实时线效计算 + 关机时间区间预测 ====================
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('segments-container');
    const addBtn = document.getElementById('add-segment');

    // 辅助函数：从 日期+时分秒 构建 Date 对象（v5：日期使用原生日历选择器）
    function buildDateTime(dateStr, hour, minute, second) {
        if (!dateStr) return null;
        const dt = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`);
        return isNaN(dt) ? null : dt;
    }

    // 创建改型段（v3：额定能力 = 预设下拉 + 「自行输入…」切换）
    function createSegment(index) {
        const div = document.createElement('div');
        div.className = 'segment';
        div.innerHTML = `
            <h4>改型轮次 ${index}</h4>
            <div class="seg-row seg-time-row">
                <label>改型时间:</label>
                <input type="date" class="segment-date" required>
                <input type="number" class="segment-hour" min="0" max="23" placeholder="时" required>
                <input type="number" class="segment-minute" min="0" max="59" placeholder="分" required>
                <input type="number" class="segment-second" min="0" max="59" value="0" placeholder="秒" required>
            </div>
            <div class="seg-row">
                <label>额定能力:</label>
                <select class="segment-capacity">
                    <option value="24000">24000</option>
                    <option value="36000">36000</option>
                    <option value="72000">72000</option>
                    <option value="60000">60000</option>
                    <option value="90000">90000</option>
                    <option value="30000">30000</option>
                    <option value="__custom__">自行输入…</option>
                </select>
                <input type="number" class="segment-capacity-custom" min="10000" max="150000" placeholder="输入额定能力" style="display:none">
                <button type="button" class="custom-back" style="display:none">◀ 预设</button>
                <label>灌装数量:</label>
                <input type="number" class="segment-output" placeholder="灌装数量" required>
            </div>
            <div class="seg-row seg-half">
                <label>剔除时间(分钟):</label>
                <input type="number" class="segment-exclude" value="0" min="0" step="0.1" placeholder="剔除分钟" required>
            </div>
            <button type="button" class="remove-segment" style="background-color:#f44336;">删除</button>
            <hr style="margin:10px 0">
        `;
        div.querySelector('.remove-segment').addEventListener('click', function() {
            div.remove();
            updateSegmentIndices();
        });
        // v3：额定能力预设下拉 / 自行输入 切换
        initCapacityInput(
            div.querySelector('.segment-capacity'),
            div.querySelector('.segment-capacity-custom'),
            div.querySelector('.custom-back')
        );
        return div;
    }

    function updateSegmentIndices() {
        const segments = document.querySelectorAll('.segment');
        segments.forEach((seg, idx) => {
            const header = seg.querySelector('h4');
            if (header) header.innerText = `改型轮次 ${idx + 1}`;
        });
    }

    // 初始化一个默认改型段
    if (container.children.length === 0) {
        container.appendChild(createSegment(1));
    }

    addBtn.addEventListener('click', function() {
        const count = container.children.length + 1;
        container.appendChild(createSegment(count));
    });

    // v3：最后一段额定能力「预设下拉/自行输入」切换
    initCapacityInput(
        document.getElementById('last-capacity'),
        document.getElementById('last-capacity-custom'),
        document.getElementById('last-custom-back')
    );

    // ========== 关机时间区间预测函数 ==========
    // 返回对象包含：
    //   canPredict: boolean
    //   message: string (不可预测时)
    //   lowerTime: Date (效率刚好达到目标下限的时间)
    //   upperTime: Date (效率刚好达到目标上限的时间)
    //   lowerEff: number (目标下限效率，小数)
    //   upperEff: number (目标上限效率，小数)
    //   pureHoursLower: number (未来段纯生产小时数，对应下限)
    //   pureHoursUpper: number (未来段纯生产小时数，对应上限)
    function predictShutdownRange(queryTime, totalActual, totalTheoretical, remaining, lastCapacity, targetLow, targetHigh) {
        const EPS = 1e-9;
        let result = { canPredict: false, message: "" };

        if (remaining <= EPS) {
            result.message = "剩余产量为0，不进行关机时间预测。";
            return result;
        }
        if (lastCapacity <= EPS) {
            result.message = "额定能力无效，无法预测。";
            return result;
        }

        // 达到目标下限所需的理论增量
        const targetTotalLow = (totalActual + remaining) / targetLow;
        const futureTheoreticalLow = targetTotalLow - totalTheoretical;
        if (futureTheoreticalLow <= EPS) {
            result.message = "当前总理论产能已足够，但仍有剩余产量，数据矛盾。";
            return result;
        }
        // 达到目标上限所需的理论增量
        const targetTotalHigh = (totalActual + remaining) / targetHigh;
        const futureTheoreticalHigh = targetTotalHigh - totalTheoretical;
        if (futureTheoreticalHigh <= EPS) {
            // 上限已经低于当前理论，意味着当前效率已经超过上限，此时无法给出上限时间（因为要降低效率需要停机）
            // 但我们可以把上限时间设为当前时间（停机等待）？这里先标记不可预测上限，但仍可预测下限
            result.message = "当前效率已超过目标上限，无法通过增加生产来达到上限，需要停机等待。";
            // 仍然可以预测下限时间
            const pureHoursLow = futureTheoreticalLow / lastCapacity;
            const shutdownLow = new Date(queryTime.getTime() + pureHoursLow * 3600000);
            result.canPredict = true;
            result.lowerTime = shutdownLow;
            result.lowerEff = targetLow;
            result.upperTime = null;
            result.upperEff = null;
            result.pureHoursLower = pureHoursLow;
            result.pureHoursUpper = null;
            return result;
        }

        const pureHoursLow = futureTheoreticalLow / lastCapacity;
        const pureHoursHigh = futureTheoreticalHigh / lastCapacity;
        const shutdownLow = new Date(queryTime.getTime() + pureHoursLow * 3600000);
        const shutdownHigh = new Date(queryTime.getTime() + pureHoursHigh * 3600000);

        result.canPredict = true;
        result.lowerTime = shutdownLow;
        result.upperTime = shutdownHigh;
        result.lowerEff = targetLow;
        result.upperEff = targetHigh;
        result.pureHoursLower = pureHoursLow;
        result.pureHoursUpper = pureHoursHigh;
        return result;
    }

    // 实时线效表单提交
    const form = document.getElementById('device-efficiency-calculator');
    form.addEventListener('submit', function(event) {
        event.preventDefault();

        // v1 修改：读取页面参数
        const cfg = readConfig();

        // 获取开机时间（v5：日期日历选择 + 时分秒）
        const startTime = buildDateTime(
            document.getElementById('start-date').value,
            document.getElementById('start-hour').value,
            document.getElementById('start-minute').value,
            document.getElementById('start-second').value
        );
        if (!startTime || isNaN(startTime)) {
            alert('请完整填写开机时间（日期和时分秒）');
            return;
        }

        // 获取关机时间（查询时间，v5：日期日历选择 + 时分秒）
        const queryTime = buildDateTime(
            document.getElementById('end-date').value,
            document.getElementById('end-hour').value,
            document.getElementById('end-minute').value,
            document.getElementById('end-second').value
        );
        if (!queryTime || isNaN(queryTime)) {
            alert('请完整填写关机时间（日期和时分秒）');
            return;
        }

        if (queryTime <= startTime) {
            alert('关机时间必须晚于开机时间');
            return;
        }

        // 获取所有改型段
        const segmentDivs = document.querySelectorAll('.segment');
        const segments = [];
        for (let div of segmentDivs) {
            // v5：改型时间 = 日期（日历选择） + 时分秒
            const segTime = buildDateTime(
                div.querySelector('.segment-date').value,
                div.querySelector('.segment-hour').value,
                div.querySelector('.segment-minute').value,
                div.querySelector('.segment-second').value
            );
            if (!segTime || isNaN(segTime)) {
                alert('请完整填写所有改型时间（日期和时分秒）');
                return;
            }
            const segIdx = segments.length + 1;
            // v3：额定能力 = 预设下拉/自行输入切换，按当前模式取值并校验
            const capSel = div.querySelector('.segment-capacity');
            const capCustom = div.querySelector('.segment-capacity-custom');
            const capErr = capacityError(capacityFromUI(capSel, capCustom));
            if (capErr) {
                alert(`第 ${segIdx} 段：${capErr}`);
                return;
            }
            const outputInput = div.querySelector('.segment-output');
            const excludeInput = div.querySelector('.segment-exclude');
            if (!outputInput.value) {
                alert(`请填写第 ${segIdx} 段的灌装数量`);
                return;
            }
            segments.push({
                time: segTime,
                capacity: parseFloat(capacityFromUI(capSel, capCustom)),
                output: parseFloat(outputInput.value),
                exclude: parseFloat(excludeInput.value) || 0
            });
        }

        // 获取最后一段参数（v3：额定能力 = 预设下拉/自行输入切换）
        const lastCapSel = document.getElementById('last-capacity');
        const lastCapCustom = document.getElementById('last-capacity-custom');
        const lastCapErr = capacityError(capacityFromUI(lastCapSel, lastCapCustom));
        if (lastCapErr) {
            alert(`最后段：${lastCapErr}`);
            return;
        }
        const lastOutput = parseFloat(document.getElementById('last-output').value);
        const lastExclude = parseFloat(document.getElementById('last-exclude').value) || 0;
        if (isNaN(lastOutput)) {
            alert('请完整填写最后段灌装数量');
            return;
        }
        const lastCapacity = parseFloat(capacityFromUI(lastCapSel, lastCapCustom));
        const remaining = parseFloat(document.getElementById('remaining-output').value) || 0;

        // 构建时间点序列
        const timePoints = [startTime, ...segments.map(s => s.time), queryTime];
        for (let i = 0; i < timePoints.length - 1; i++) {
            if (timePoints[i] >= timePoints[i + 1]) {
                alert('时间点必须依次递增（开机 < 改型1 < 改型2 < ... < 关机）');
                return;
            }
        }

        // 计算总实际产量、理论产能（已生产部分）
        let totalActual = 0;
        let totalTheoretical = 0;

        for (let i = 0; i < timePoints.length - 1; i++) {
            const start = timePoints[i];
            const end = timePoints[i + 1];
            const durationMin = (end - start) / (1000 * 60);

            let capacity, output, exclude;
            if (i < segments.length) {
                capacity = segments[i].capacity;
                output = segments[i].output;
                exclude = segments[i].exclude;
            } else {
                capacity = lastCapacity;
                output = lastOutput;
                exclude = lastExclude;
            }

            if (exclude > durationMin) {
                alert(`第 ${i+1} 段剔除时间（${exclude}分钟）不能超过该段总时长（${durationMin.toFixed(2)}分钟）`);
                return;
            }

            const effectiveDurationMin = durationMin - exclude;
            const theoreticalHour = effectiveDurationMin / 60;
            const theoretical = capacity * theoreticalHour;
            totalTheoretical += theoretical;
            totalActual += output;
        }

        if (totalTheoretical === 0) {
            document.getElementById('efficiency-result').innerHTML = '理论产能为零，请检查输入';
            return;
        }

        const efficiency = (totalActual / totalTheoretical) * 100;

        // ========== 基准效率对比（v1 修改：基准值取自页面参数，默认93%） ==========
        const targetEffPercent = cfg.benchmark;  // 基准（默认93%）
        const targetEff = targetEffPercent / 100;
        let comparisonText = '';

        if (efficiency/100 >= targetEff - 1e-9) {
            comparisonText = `已达到效率区间，基准效率${targetEffPercent}%`;
        } else {
            const numerator = targetEff * totalTheoretical - totalActual;
            // v6：追赶效率上下限取自参数设置（默认 95% ~ 105%，可自行调整）
            const eta_min = cfg.catchLow / 100;
            const eta_max = cfg.catchHigh / 100;
            if (eta_min <= targetEff) {
                comparisonText = `无法以${(eta_min * 100).toFixed(1)}%以上效率追赶（目标效率过高），请手动调整`;
            } else {
                const deltaT_at_min = numerator / (eta_min - targetEff);
                const deltaA_at_min = eta_min * deltaT_at_min;
                const deltaT_at_max = numerator / (eta_max - targetEff);
                const deltaA_at_max = eta_max * deltaT_at_max;

                let feasible = false;
                let eta_low_feasible, eta_high_feasible, deltaT_low, deltaT_high;

                if (deltaA_at_min <= remaining + 1e-9) {
                    feasible = true;
                    eta_low_feasible = eta_min;
                    eta_high_feasible = eta_max;
                    deltaT_low = deltaT_at_max;
                    deltaT_high = deltaT_at_min;
                } else if (deltaA_at_max <= remaining + 1e-9) {
                    const denominator = remaining - numerator;
                    if (denominator > 1e-9) {
                        const eta_crit = (remaining * targetEff) / denominator;
                        if (eta_crit >= eta_min - 1e-9 && eta_crit <= eta_max + 1e-9) {
                            feasible = true;
                            eta_low_feasible = eta_crit;
                            eta_high_feasible = eta_max;
                            deltaT_low = numerator / (eta_high_feasible - targetEff);
                            deltaT_high = numerator / (eta_low_feasible - targetEff);
                        }
                    }
                }

                if (feasible) {
                    const hours_low = deltaT_low / lastCapacity;
                    const hours_high = deltaT_high / lastCapacity;
                    comparisonText = `需至少以 ${(eta_low_feasible*100).toFixed(1)}%-${(eta_high_feasible*100).toFixed(1)}% 效率运行 ${hours_high.toFixed(2)} 到  ${hours_low.toFixed(2)}小时，可使总效率达到${targetEffPercent}%`;
                    if (remaining > 0 && deltaA_at_min > remaining) {
                        comparisonText += `（剩余产量限制）`;
                    }
                } else {
                    comparisonText = `剩余产量不足，无法达到基准${targetEffPercent}%，追赶最高效率${(eta_max * 100).toFixed(1)}%`;
                }
            }
        }

        // 上限效率判断（v1 修改：上限值取自页面参数，默认97%）
        const upperEff = cfg.upperLimit;
        let upperText = '';
        if (efficiency > upperEff) {
            const neededTotalForUpper = totalActual / (upperEff / 100);
            const extraTheoretical = neededTotalForUpper - totalTheoretical;
            if (extraTheoretical > 0) {
                const extraMinutes = (extraTheoretical / lastCapacity) * 60;
                upperText = `<br><span style="color: purple;">效率超过上限${upperEff}%，需停机 ${extraMinutes.toFixed(2)} 分钟以使效率降至上限以下</span>`;
            } else {
                upperText = `<br><span style="color: purple;">效率超过上限${upperEff}%，但计算异常</span>`;
            }
        }

        // ========== 关机时间区间预测（v1 修改：区间取自页面参数，默认93%~96.8%） ==========
        const TARGET_LOW = cfg.predLow / 100;    // 默认 0.932
        const TARGET_HIGH = cfg.predHigh / 100;  // 默认 0.968

        const predictResult = predictShutdownRange(
            queryTime, totalActual, totalTheoretical, remaining, lastCapacity,
            TARGET_LOW, TARGET_HIGH
        );

        let predictHtml = '';
        if (predictResult.canPredict) {
            const formatDateTime = (d) => {
                let m = d.getMonth()+1;
                let day = d.getDate();
                let h = d.getHours();
                let min = d.getMinutes();
                let sec = d.getSeconds();
                return `${m.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')} ${h.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
            };
            if (predictResult.upperTime) {
                // 有上下限
                predictHtml = `<div style="background:#e9f5ff; padding:12px; border-radius:12px; margin-top:12px; border-left:4px solid #007aff;">
                    <strong>⏰ 关机时间预测 (效率区间 ${(TARGET_LOW*100).toFixed(1)}% ~ ${(TARGET_HIGH*100).toFixed(1)}%)</strong><br>
                     预测关机时间：<span style="font-weight:bold;color:#0051d5;">${formatDateTime(predictResult.upperTime)}</span> (效率 ${(predictResult.upperEff*100).toFixed(1)}%) 至 <span style="font-weight:bold;color:#0051d5;">${formatDateTime(predictResult.lowerTime)}</span> (效率 ${(predictResult.lowerEff*100).toFixed(1)}%)
                    </div>`;
            } else {
                // 只有下限，无法达到上限（效率已超）
                predictHtml = `<div style="background:#fff0f0; padding:12px; border-radius:12px; margin-top:12px; border-left:4px solid #ff3b30;">
                    <strong>⚠️ 关机时间预测（仅下限）</strong><br>
                    当前效率已超过上限，无法通过增加生产来达到上限。如需将效率降至上限以下，请停机等待。<br>
                    若继续生产，最晚关机时间为 <strong>${formatDateTime(predictResult.lowerTime)}</strong> (效率 ${(predictResult.lowerEff*100).toFixed(1)}%)。<br>
                    </div>`;
            }
        } else {
            predictHtml = `<div style="background:#fff0f0; padding:12px; border-radius:12px; margin-top:12px; border-left:4px solid #ff3b30;">
                <strong>关机时间预测不可用</strong><br>${predictResult.message || '剩余产量不足或数据异常，无法准确预测关机时间'}</div>`;
        }

        // 组合最终显示（v1：结果放入卡片容器）
        let resultHtml = `<div class="result-card">目前线效率为 <span style="color: red;">${efficiency.toFixed(3)}%</span><br>`;
        resultHtml += `<span style="color: ${comparisonText.includes('无法') ? 'gray' : (comparisonText.includes('超过') ? 'green' : 'orange')};">${comparisonText}</span>`;
        resultHtml += upperText;
        resultHtml += '<br>' + predictHtml;
        resultHtml += '</div>';

        document.getElementById('efficiency-result').innerHTML = resultHtml;
    });
});
