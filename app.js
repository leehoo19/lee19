document.getElementById('inputForm').addEventListener('submit', function(event) {    
  event.preventDefault();   
     
  const startTimeStr = document.getElementById('startTime').value;    
  const ratedCapacity = parseFloat(document.getElementById('ratedCapacity').value);    
  const ratedCapacity2 = parseFloat(document.getElementById('ratedCapacity2').value);    
  const efficiency = parseFloat(document.getElementById('efficiency').value) / 100;    
  const productionTons = parseFloat(document.getElementById('productionTons').value);   
  const productionTons2 = parseFloat(document.getElementById('productionTons2').value);   
  const bottleType = parseFloat(document.getElementById('bottleType').value);  // 第一个转换  
  const bottleType2 = parseFloat(document.getElementById('bottleType2').value); // 第二个转换  
  const fixedLoss = parseFloat(document.getElementById('fixedLoss').value) / 100;     
  // 计算预计产量 
  const estimatedBottles = productionTons * (1 - fixedLoss) * 1000000 / bottleType;    
  const estimatedBottles2 = productionTons2 * (1 - fixedLoss) * 1000000 / bottleType2;   
  // 计算设备运行时间（分钟）    
  const operatingTimeMinutes1 = (estimatedBottles / ratedCapacity) / efficiency * 60;    
  const operatingTimeMinutes2 = (estimatedBottles2 / ratedCapacity2) / efficiency * 60;  
  const totalOperatingTimeMinutes = operatingTimeMinutes1 + operatingTimeMinutes2; 
  // 字符串转换    
  const startTime = new Date(startTimeStr);    
  if (isNaN(startTime.getTime())) {  
  // 处理无效字符串  
    console.error('无效的日期字符串:', startTimeStr);  
    return;  
  }  
    
  // 计算关机时间    
  const shutdownTime = new Date(startTime.getTime() + totalOperatingTimeMinutes * 60000); // 毫秒    
    
  // 格式化关机时间   
  const shutdownTimeStr = shutdownTime.toLocaleString('zh-CN', {    
    year: 'numeric',    
    month: '2-digit',    
    day: '2-digit',    
    hour: '2-digit',    
    minute: '2-digit',    
    second: '2-digit',    
    hour12: false // 使用24小时制    
  });    
    
  document.getElementById('shutdownTime').innerHTML = `预测关机时间为<span style="color: red;">${shutdownTimeStr}</span>`;    
});
document.getElementById('device-efficiency-calculator').addEventListener('submit', function(event) {
    event.preventDefault();

    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const capacity1 = document.getElementById('capacity1').value;
    const output1 = document.getElementById('output1').value;
    const capacity2 = document.getElementById('capacity2').value;
    const output2 = document.getElementById('output2').value;
    const gxTime = document.getElementById('gx-time').value;
    const output1Number = Number(output1);  
    const output2Number = Number(output2);  
    const capacity1Number = Number(capacity1); 
    const capacity2Number = Number(capacity2);
    
    // 计算设备运行时间
    const runtime2 = (new Date(endTime) - new Date(gxTime)) / 1000 / 60 / 60;
    const runtime1 = (new Date(gxTime) - new Date(startTime)) / 1000 / 60 / 60;
    const runtime1Number = Number( runtime1 );
    const runtime2Number = Number( runtime2 );
    // 计算效率
    const T = output1Number + output2Number; 
    const TT = (runtime1Number*capacity1Number)+(runtime2Number*capacity2Number);
    const efficiency = T / TT;
    const efficiency1=Number(efficiency);
    const efficiency2=efficiency1*100;
    // 显示效率
  document.getElementById('efficiency-result').innerHTML = `目前线效率为<span style="color: red;">${efficiency2.toFixed(3)}%</span>。`;
});
