// GLOBAL VARIABLES
let isCurrentPenalty = false; 
let receiptSummaryHTML = ""; 

// --- HELPER FUNCTIONS ---

function parseNumber(value) {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/,/g, '')) || 0;
}

function formatNumber(num) {
    return num.toLocaleString('en-US');
}

function formatPrincipal() {
    const input = document.getElementById("principal");
    let rawValue = input.value.replace(/[^0-9.]/g, '');
    const parts = rawValue.split('.');
    if (parts.length > 2) rawValue = parts[0] + '.' + parts.slice(1).join('');

    if (rawValue) {
        if (rawValue.endsWith('.')) {
             input.value = rawValue;
        } else {
             const number = parseFloat(rawValue);
             const formatted = number.toLocaleString('en-US', { maximumFractionDigits: 2 });
             if (rawValue.includes('.') && !formatted.includes('.')) {
                 input.value = formatted + '.';
             } else if (parts.length > 1) {
                  input.value = parseFloat(parts[0]).toLocaleString('en-US') + "." + parts[1];
             } else {
                 input.value = formatted;
             }
        }
    } else {
        input.value = "";
    }
    // Remove error styling if user starts typing
    input.classList.remove("input-error", "shake");
    autoCalculateTotal();
}

function autoCalculateTotal() {
    const principal = parseNumber(document.getElementById("principal").value);
    const rate = parseNumber(document.getElementById("interestRate").value);
    
    if (principal > 0) {
        const total = principal + (principal * (rate / 100));
        document.getElementById("amount").value = formatNumber(total);
    } else {
        document.getElementById("amount").value = "";
    }
}

// Set Minimum Dates & Enter Key Support
window.onload = function() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    document.getElementById("paymentDate").value = today;
    
    const minDate = "2024-01-01"; 
    document.getElementById("loanDate").setAttribute("min", minDate);
    document.getElementById("dueDate").setAttribute("min", minDate);
    document.getElementById("paymentDate").setAttribute("min", minDate);

    // Add "Enter Key" support to all inputs
    document.querySelectorAll("input").forEach(input => {
        input.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                calculate(); // Trigger calculation
            }
        });
        // Remove red border when user clicks/types
        input.addEventListener("input", function() {
            this.classList.remove("input-error", "shake");
        });
    });
};

// --- MAIN CALCULATION ---
function calculate() {
    // 1. Get Elements
    const elPrincipal = document.getElementById("principal");
    const elAmount = document.getElementById("amount");
    const elDueDate = document.getElementById("dueDate");
    const elPayDate = document.getElementById("paymentDate");
    const elPayTime = document.getElementById("paymentTime");

    // 2. Validate Inputs (Visual Error Handling)
    let hasError = false;
    let requiredFields = [elPrincipal, elAmount, elDueDate, elPayDate, elPayTime];

    requiredFields.forEach(field => {
        if (!field.value) {
            field.classList.add("input-error", "shake"); // Add red border and shake
            hasError = true;
        } else {
            field.classList.remove("input-error", "shake");
        }
    });

    // Stop if errors exist (No Alert Box needed anymore)
    if (hasError) return;

    // 3. Parse Values
    const principal = parseNumber(elPrincipal.value);
    const amount = parseNumber(elAmount.value);
    const dueDateVal = elDueDate.value;
    const payDateVal = elPayDate.value;
    const payTimeVal = elPayTime.value;

    // Logic: Penalty Starts Day AFTER Due Date at 12:00 AM
    const dueDateObj = new Date(dueDateVal + "T00:00:00");
    const start = new Date(dueDateObj);
    start.setDate(start.getDate() + 1); 

    const end = new Date(payDateVal + "T" + payTimeVal + ":00");
    const outBox = document.getElementById("output");
    const breakBox = document.getElementById("breakdown");
    const downloadBtn = document.getElementById("finalDownloadBtn");

    // Check if Paid On Time
    if (end <= start) {
        isCurrentPenalty = false; 
        outBox.innerHTML = "<p><b>Status:</b> Paid on Time</p><p><b>Total:</b> ₱" + formatNumber(amount) + "</p>";
        outBox.style.display = "block";
        breakBox.style.display = "none";
        downloadBtn.style.display = "block"; 
        return;
    }

    // Calculate Penalty
    isCurrentPenalty = true; 
    let totalPenalty = 0;
    let count = 0;
    let detailedHTML = "<h3>Detailed Timeline (Full Breakdown)</h3>";
    let dailyCounts = {}; 
    let currentMarker = new Date(start);

    while (new Date(currentMarker.getTime() + 5 * 60 * 60 * 1000) <= end) {
        let nextMarker = new Date(currentMarker.getTime() + 5 * 60 * 60 * 1000);
        count++;
        totalPenalty += 50;

        const d = currentMarker.getDate().toString().padStart(2, '0');
        const m = (currentMarker.getMonth() + 1).toString().padStart(2, '0');
        const y = currentMarker.getFullYear().toString().slice(-2);
        const dateKey = `${m}/${d}/${y}`; 

        if (!dailyCounts[dateKey]) { dailyCounts[dateKey] = 0; }
        dailyCounts[dateKey]++;

        const sTime = currentMarker.toLocaleString('en-US', { hour: 'numeric', hour12: true }).toLowerCase();
        const eTime = nextMarker.toLocaleString('en-US', { hour: 'numeric', hour12: true }).toLowerCase();
        
        detailedHTML += `<p style="border-bottom: 1px solid #eee; padding: 5px 0; font-size: 0.85em;">
            <b>Day ${count} (${dateKey}):</b> ${sTime} - ${eTime} <span style="float:right;">+₱50</span>
        </p>`;
        
        currentMarker = nextMarker;
    }

    receiptSummaryHTML = "";
    for (const [date, penCount] of Object.entries(dailyCounts)) {
        const dailyTotal = penCount * 50;
        receiptSummaryHTML += `${date}: ${penCount} blocks (₱${formatNumber(dailyTotal)})\n`;
    }

    const finalTotal = amount + totalPenalty;

    outBox.innerHTML = `
        <p><b>Principal:</b> ₱${formatNumber(principal)}</p>
        <p><b>Interest Added:</b> ₱${formatNumber(amount - principal)}</p>
        <p><b>Penalty Blocks:</b> ${count}</p>
        <p><b>Penalty Total:</b> ₱${formatNumber(totalPenalty)}</p>
        <hr>
        <p style="font-size:1.3em; color:#ff69b4;"><b>Grand Total: ₱${formatNumber(finalTotal)}</b></p>
    `;
    outBox.style.display = "block";
    
    if (count > 0) {
        breakBox.innerHTML = detailedHTML;
        breakBox.style.display = "block";
    }
    
    downloadBtn.style.display = "block"; 
}

// --- DOWNLOAD & RESET ---
async function downloadSmartReceipt() {
    await saveAsImage(isCurrentPenalty);
    resetForm();
}

async function saveAsImage(isPenalty) {
    const name = document.getElementById("borrowerName").value || "Valued Customer";
    const principal = parseNumber(document.getElementById("principal").value);
    const amount = parseNumber(document.getElementById("amount").value);
    const loanDate = document.getElementById("loanDate").value;
    const dueDate = document.getElementById("dueDate").value;
    const summary = document.getElementById("output").innerText;
    
    const receiptDiv = document.getElementById("receipt-content");
    
    receiptDiv.innerHTML = `
        <h2 style="text-align:center;">OFFICIAL RECEIPT</h2>
        <p style="text-align:center; font-size:12px;">LENDING SERVICES</p>
        <hr>
        <p><b>Date:</b> ${new Date().toLocaleString()}</p>
        <p><b>Borrower:</b> ${name}</p>
        <p><b>Loan Start:</b> ${loanDate}</p>
        <p><b>Payment Due:</b> ${dueDate}</p>
        <div style="border: 1px dashed #ccc; padding: 5px; margin: 5px 0;">
            <p>Principal: ₱${formatNumber(principal)}</p>
            <p>Interest Amt: ₱${formatNumber(amount - principal)}</p>
            <p><b>Base Total: ₱${formatNumber(amount)}</b></p>
        </div>
        <hr>
        <p><b>PAYMENT SUMMARY:</b></p>
        <pre style="font-family:inherit; white-space:pre-wrap;">${isPenalty ? summary : 'Status: Paid on Time\nPenalty: ₱0\nGrand Total: ₱' + formatNumber(amount)}</pre>
        <hr>
        ${isPenalty ? `<p><b>DAILY PENALTY SUMMARY:</b></p><pre style="font-family:inherit; font-size:12px; white-space:pre-wrap;">${receiptSummaryHTML}</pre><hr>` : ''}
        <p style="text-align:center; font-weight:bold;">THANK YOU!</p>
    `;

    const hiddenArea = document.getElementById("final-receipt-image");
    const canvas = await html2canvas(hiddenArea);
    const link = document.createElement("a");
    link.download = `Receipt_${name.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function copyToClipboard() {
    const name = document.getElementById("borrowerName").value || "Customer";
    const amount = parseNumber(document.getElementById("amount").value);
    const outBox = document.getElementById("output");
    
    if (outBox.style.display === "none") {
        // Here we can also use the red border effect
        calculate(); 
        return;
    }

    const breakdown = document.getElementById("breakdown");
    let text = `📌 *LENDING UPDATE*\n👤 *Borrower:* ${name}\n📅 *Date:* ${new Date().toLocaleDateString()}\n--------------------------\n`;
    
    if (isCurrentPenalty) {
        text += `⚠️ *STATUS: LATE PAYMENT*\n` + outBox.innerText + `\n\n📑 *FULL BREAKDOWN:*\n` + breakdown.innerText;
    } else {
        text += `✅ *STATUS: PAID ON TIME*\nTotal: ₱${formatNumber(amount)}`;
    }
    text += `\n--------------------------\nThank you! 🙏`;

    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
}

function resetForm() {
    document.querySelectorAll("input").forEach(i => {
        i.value = "";
        i.classList.remove("input-error", "shake");
    });
    document.getElementById("interestRate").value = "20"; 
    
    document.getElementById("output").style.display = "none";
    document.getElementById("breakdown").style.display = "none";
    document.getElementById("finalDownloadBtn").style.display = "none"; 
    document.getElementById("output").innerHTML = '<p style="color: #888; text-align: center;">Enter Loan Details...</p>';
}