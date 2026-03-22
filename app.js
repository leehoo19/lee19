// 灌装记录相关函数（保持不变）
let records = JSON.parse(localStorage.getItem('filling-records')) || [];

function getCurrentTime() {
    const d = new Date();
    return `${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function saveToLocalStorage() {
    localStorage.setItem('filling-records', JSON.stringify(records));
}

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

// ==================== 实时线效计算 + 关机时间区间预测 ====================
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('segments-container');
    const addBtn = document.getElementById('add-segment');

    // 辅助函数：从日期和时分秒构建 Date 对象（本地时间）
    function buildDateTime(dateStr, hour, minute, second) {
        if (!dateStr) return null;
        return new Date(`${dateStr}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`);
    }

    // 创建改型段
    function createSegment(index) {
        const div = document.createElement('div');
        div.className = 'segment';
        div.innerHTML = `
            <h4>改型轮次 ${index}</h4>
            <div class="time-input-group">
                <label>改型时间:</label>
                <input type="date" class="segment-date" required>
                <input type="number" class="segment-hour" min="0" max="23" placeholder="时" required>
                <input type="number" class="segment-minute" min="0" max="59" placeholder="分" required>
                <input type="number" class="segment-second" min="0" max="59" value="0" placeholder="秒" required>
            </div>
            <label>额定能力:</label>
            <select class="segment-capacity" required>
                <option value="24000">24000</option>
                <option value="36000">36000</option>
                <option value="72000">72000</option>
                <option value="60000">60000</option>
                <option value="90000">90000</option>
            </select>
            <label>灌装数量:</label>
            <input type="number" class="segment-output" placeholder="灌装数量" required>
            <label>剔除时间(分钟):</label>
            <input type="number" class="segment-exclude" value="0" min="0" step="0.1" placeholder="剔除分钟" required>
            <button type="button" class="remove-segment" style="background-color:#f44336;">删除</button>
            <hr style="margin:10px 0">
        `;
        div.querySelector('.remove-segment').addEventListener('click', function() {
            div.remove();
            updateSegmentIndices();
        });
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

        // 获取开机时间
        const startDate = document.getElementById('start-date').value;
        const startHour = parseInt(document.getElementById('start-hour').value, 10);
        const startMinute = parseInt(document.getElementById('start-minute').value, 10);
        const startSecond = parseInt(document.getElementById('start-second').value, 10);
        const startTime = buildDateTime(startDate, startHour, startMinute, startSecond);
        if (!startTime || isNaN(startTime)) {
            alert('请完整填写开机时间（日期和时分秒）');
            return;
        }

        // 获取关机时间（查询时间）
        const endDate = document.getElementById('end-date').value;
        const endHour = parseInt(document.getElementById('end-hour').value, 10);
        const endMinute = parseInt(document.getElementById('end-minute').value, 10);
        const endSecond = parseInt(document.getElementById('end-second').value, 10);
        const queryTime = buildDateTime(endDate, endHour, endMinute, endSecond);
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
            const segDate = div.querySelector('.segment-date').value;
            const segHour = parseInt(div.querySelector('.segment-hour').value, 10);
            const segMinute = parseInt(div.querySelector('.segment-minute').value, 10);
            const segSecond = parseInt(div.querySelector('.segment-second').value, 10);
            const segTime = buildDateTime(segDate, segHour, segMinute, segSecond);
            if (!segTime || isNaN(segTime)) {
                alert('请完整填写所有改型时间（日期和时分秒）');
                return;
            }
            const capacitySelect = div.querySelector('.segment-capacity');
            const outputInput = div.querySelector('.segment-output');
            const excludeInput = div.querySelector('.segment-exclude');
            if (!capacitySelect.value || !outputInput.value) {
                alert('请完整填写所有改型段的额定能力和灌装数量');
                return;
            }
            segments.push({
                time: segTime,
                capacity: parseFloat(capacitySelect.value),
                output: parseFloat(outputInput.value),
                exclude: parseFloat(excludeInput.value) || 0
            });
        }

        // 获取最后一段参数
        const lastCapacitySelect = document.getElementById('last-capacity');
        const lastOutput = parseFloat(document.getElementById('last-output').value);
        const lastExclude = parseFloat(document.getElementById('last-exclude').value) || 0;
        if (!lastCapacitySelect.value || isNaN(lastOutput)) {
            alert('请完整填写最后段参数');
            return;
        }
        const lastCapacity = parseFloat(lastCapacitySelect.value);
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

        // ========== 原有基准效率对比（保持不变） ==========
        let targetEffPercent = 93;  // 基准93%
        const targetEff = targetEffPercent / 100;
        let comparisonText = '';

        if (efficiency/100 >= targetEff - 1e-9) {
            comparisonText = `已达到效率区间，基准效率${targetEffPercent}%`;
        } else {
            const numerator = targetEff * totalTheoretical - totalActual;
            const eta_min = 0.95;
            const eta_max = 1.05;
            if (eta_min <= targetEff) {
                comparisonText = `无法以95%以上效率追赶（目标效率过高），请手动调整`;
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
                    comparisonText = `剩余产量不足，无法达到基准${targetEffPercent}%，追赶最高效率105%`;
                }
            }
        }

        // 上限效率判断（97%）
        const upperEff = 97;
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

        // ========== 关机时间区间预测 ==========
        const TARGET_LOW = 0.932;   // 下限93%
        const TARGET_HIGH = 0.968; // 上限96.8%

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

        // 组合最终显示
        let resultHtml = `目前线效率为 <span style="color: red;">${efficiency.toFixed(3)}%</span><br>`;
        resultHtml += `<span style="color: ${comparisonText.includes('无法') ? 'gray' : (comparisonText.includes('超过') ? 'green' : 'orange')};">${comparisonText}</span>`;
        resultHtml += upperText;
        resultHtml += '<br>' + predictHtml;

        document.getElementById('efficiency-result').innerHTML = resultHtml;
    });
});
