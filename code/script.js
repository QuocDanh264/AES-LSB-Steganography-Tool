// Hàm chuyển đổi tab
function showTab(tabId, btn) {
    // Ẩn tất cả các nội dung tab
    document.querySelectorAll('.tab-content').forEach(div => div.classList.remove('active'));
    // Gỡ lớp 'active' khỏi tất cả các nút tab
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));

    // Thêm lớp 'active' vào nút tab được nhấp
    btn.classList.add('active');
    // Hiển thị nội dung tab tương ứng
    document.getElementById(tabId).classList.add('active');
}

// --- Hàm mã hóa/giải mã AES ---
function encryptMessage(message, password) {
    try {
        return CryptoJS.AES.encrypt(message, password).toString();
    } catch (error) {
        console.error("Lỗi khi mã hóa tin nhắn:", error);
        alert("Có lỗi xảy ra khi mã hóa tin nhắn. Vui lòng kiểm tra lại khóa hoặc nội dung.");
        return null;
    }
}

function decryptMessage(ciphertext, password) {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, password);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        // Crypto-JS sẽ trả về chuỗi rỗng nếu giải mã không thành công (khóa sai)
        if (!decryptedText && ciphertext.length > 0) {
            // Có thể đây là khóa sai, hoặc dữ liệu không phải là AES hợp lệ
            // Kiểm tra xem có dữ liệu trả về và có phải là chuỗi rỗng không
            // để phân biệt lỗi giải mã vs dữ liệu rỗng.
            return null;
        }
        return decryptedText;
    } catch (error) {
        console.error("Lỗi khi giải mã tin nhắn:", error);
        return null; // Trả về null nếu giải mã thất bại
    }
}

// --- Hàm chuyển đổi nhị phân (LSB) ---
function toBinary(text) {
    return [...text].map(char => char.charCodeAt().toString(2).padStart(8, '0')).join('');
}

function fromBinary(binary) {
    try {
        // Đảm bảo chuỗi nhị phân có độ dài chia hết cho 8
        if (binary.length % 8 !== 0) {
            binary = binary.substring(0, binary.length - (binary.length % 8));
        }
        if (binary.length === 0) {
            return '';
        }
        return binary.match(/.{8}/g).map(b => String.fromCharCode(parseInt(b, 2))).join('');
    } catch (error) {
        console.error("Lỗi khi chuyển đổi từ nhị phân:", error);
        return '';
    }
}

// --- Hàm nhúng và trích xuất tin nhắn từ ảnh ---
function embedMessageInImage(imageData, message) {
    // Thêm dấu kết thúc tin nhắn để biết khi nào dừng việc đọc
    const binary = toBinary(message + '####');
    const newData = new Uint8ClampedArray(imageData.data);

    // Kiểm tra xem ảnh có đủ chỗ để chứa tin nhắn không (mỗi bit tin nhắn cần 1 pixel)
    if (binary.length > newData.length / 4) {
        alert('Ảnh quá nhỏ để chứa toàn bộ thông tin! Vui lòng chọn ảnh lớn hơn hoặc rút gọn tin nhắn.');
        return null; // Trả về null nếu không đủ chỗ
    }

    for (let i = 0; i < binary.length; i++) {
        // Chỉ thay đổi bit cuối cùng của kênh màu đỏ (pixel[0] của mỗi bộ RGBA)
        // (newData[i * 4] & 0xFE) giữ nguyên các bit còn lại của kênh đỏ,
        // chỉ thay đổi bit cuối cùng theo bit của tin nhắn (parseInt(binary[i]))
        newData[i * 4] = (newData[i * 4] & 0xFE) | parseInt(binary[i]);
    }
    return new ImageData(newData, imageData.width, imageData.height);
}

function extractMessageFromImage(imageData) {
    let binary = '';
    // Lấy bit cuối cùng của kênh màu đỏ từ mỗi pixel
    // Duyệt qua tất cả các pixel, mỗi pixel có 4 giá trị (R, G, B, A)
    for (let i = 0; i < imageData.data.length; i += 4) {
        binary += (imageData.data[i] & 1); // Lấy bit cuối cùng của kênh đỏ (data[i])
    }
    const extractedText = fromBinary(binary);
    // Tìm dấu kết thúc và chỉ trả về phần tin nhắn trước đó
    const parts = extractedText.split('####');
    return parts[0];
}

// --- Hàm mã hóa và giấu vào ảnh ---
function encryptAndEmbed() {
    const imageInput = document.getElementById('imageInput');
    const message = document.getElementById('secretMessage').value.trim();
    const key = document.getElementById('encryptionKey').value.trim();
    const encryptResultArea = document.getElementById('encryptResultArea');
    const encodedImageDisplay = document.getElementById('encodedImage');
    const downloadLink = document.getElementById('downloadLink');
    const canvas = document.getElementById('canvas');

    if (imageInput.files.length === 0) {
        alert('Vui lòng chọn ảnh gốc để giấu tin và mã hóa.');
        return;
    }

    if (!message) {
        alert('Vui lòng nhập nội dung cần giấu.');
        return;
    }
    if (!key) {
        alert('Vui lòng nhập khóa bí mật.');
        return;
    }

    const encryptedMessage = encryptMessage(message, key);
    if (!encryptedMessage) {
        // Lỗi đã được alert bên trong encryptMessage
        return;
    }

    const file = imageInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const image = new Image();
        image.onload = function() {
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const embedded = embedMessageInImage(imageData, encryptedMessage);

            if (!embedded) {
                // Lỗi đã được alert bên trong embedMessageInImage (ví dụ: ảnh quá nhỏ)
                encryptResultArea.style.display = 'none'; // Đảm bảo ẩn kết quả nếu có lỗi
                return;
            }

            ctx.putImageData(embedded, 0, 0);

            const dataURL = canvas.toDataURL('image/png');
            encodedImageDisplay.src = dataURL;
            encodedImageDisplay.style.display = 'block';
            downloadLink.href = dataURL;
            downloadLink.style.display = 'inline-block';
            encryptResultArea.style.display = 'block';
            alert('Mã hóa và giấu tin thành công! Bạn có thể tải ảnh xuống.');
        };
        image.onerror = () => {
            alert('Không thể tải ảnh đã chọn. Vui lòng kiểm tra định dạng ảnh.');
            encryptResultArea.style.display = 'none';
        };
        image.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- Hàm xử lý giải mã từ ảnh ---
function handleDecode() {
    const file = document.getElementById('encodedInput').files[0];
    const rawKey = document.getElementById('decryptionKey').value.trim();
    const password = document.getElementById('decryptionPassword').value.trim();

    if (!file) {
        alert("Vui lòng chọn ảnh đã chứa thông tin.");
        return;
    }
    if (!rawKey) {
        alert("Vui lòng nhập khóa bí mật hoặc chuỗi AES đã mã hóa.");
        return;
    }

    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const hiddenData = extractMessageFromImage(imageData);

            let actualKey = rawKey;
            if (password) {
                // Thử giải mã khóa bí mật nếu có mật khẩu
                const decryptedKey = decryptMessage(rawKey, password);
                if (decryptedKey) {
                    actualKey = decryptedKey;
                } else {
                    alert("Giải mã khóa bí mật thất bại. Kiểm tra mật khẩu hoặc khóa AES đã mã hóa.");
                    return;
                }
            }

            const decryptedMessage = decryptMessage(hiddenData, actualKey);

            if (decryptedMessage) {
                alert(`Thông tin đã giải mã:\n${decryptedMessage}`);
            } else {
                alert("Giải mã tin nhắn thất bại. Vui lòng kiểm tra lại ảnh và khóa bí mật (hoặc mật khẩu giải mã khóa).");
            }
        };
        img.onerror = () => {
            alert("Không thể tải ảnh. Vui lòng đảm bảo đây là tệp ảnh hợp lệ.");
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- Hàm mã hóa khóa bí mật (cho tùy chọn nâng cao) ---
function encryptSecretKey() {
    const secret = document.getElementById('encryptionKey').value.trim();
    const password = document.getElementById('secretPassword').value.trim();
    const encryptedKeyOutput = document.getElementById('encryptedKeyOutput');

    if (!secret || !password) {
        alert("Vui lòng nhập khóa bí mật và mật khẩu để mã hóa.");
        return;
    }
    const encrypted = encryptMessage(secret, password);
    if (encrypted) {
        encryptedKeyOutput.value = encrypted;
        alert("Khóa bí mật đã được mã hóa.");
    } else {
        alert("Mã hóa khóa bí mật thất bại.");
    }
}

// --- Hàm sao chép khóa đã mã hóa ---
function copyEncryptedKey() {
    const output = document.getElementById('encryptedKeyOutput');
    if (!output.value) {
        alert("Không có dữ liệu để sao chép.");
        return;
    }
    navigator.clipboard.writeText(output.value).then(() => {
        alert("Đã sao chép khóa đã mã hóa.");
    }).catch(err => {
        console.error('Không thể sao chép văn bản: ', err);
        alert('Không thể sao chép khóa. Vui lòng sao chép thủ công.');
    });
}

// --- Các hàm tính toán so sánh ảnh ---

// Mean Squared Error (MSE)
function calculateMSE(imgData1, imgData2) {
    if (imgData1.width !== imgData2.width || imgData1.height !== imgData2.height) {
        console.warn("Kích thước ảnh không khớp, MSE có thể không chính xác. Đang xử lý trên kích thước nhỏ hơn.");
    }
    let mse = 0;
    const len = Math.min(imgData1.data.length, imgData2.data.length); // Xử lý nếu kích thước data khác nhau
    for (let i = 0; i < len; i += 4) {
        const dr = imgData1.data[i] - imgData2.data[i];
        const dg = imgData1.data[i + 1] - imgData2.data[i + 1];
        const db = imgData1.data[i + 2] - imgData2.data[i + 2];
        mse += dr * dr + dg * dg + db * db;
    }
    return mse / (len / 4); // Chia cho số lượng pixel
}

// Peak Signal-to-Noise Ratio (PSNR)
function calculatePSNR(mse) {
    if (mse === 0) return Infinity; // Hai ảnh giống hệt
    const maxPixelValue = 255; // Giá trị pixel tối đa
    return 10 * Math.log10((maxPixelValue * maxPixelValue) / mse);
}

// Structural Similarity Index (SSIM) - Đơn giản hóa cho kênh RGB
// SSIM là một chỉ số phức tạp, đây là một phiên bản đơn giản hóa.
function calculateSSIM_RGB(imageData1, imageData2) {
    const { data: data1 } = imageData1;
    const { data: data2 } = imageData2;
    const n = data1.length / 4; // Số lượng pixel

    if (n === 0) return 0; // Tránh chia cho 0

    // Hằng số cho SSIM (thường được dùng C1 = (0.01*L)^2, C2 = (0.03*L)^2 với L = 255)
    const L = 255;
    const C1 = (0.01 * L) ** 2;
    const C2 = (0.03 * L) ** 2;

    let sum_muX = 0, sum_muY = 0;
    let sum_sigmaX2 = 0, sum_sigmaY2 = 0, sum_sigmaXY = 0;

    for (let i = 0; i < data1.length; i += 4) {
        // Tính giá trị trung bình (grayscale) cho mỗi pixel
        const x = (data1[i] * 0.299 + data1[i + 1] * 0.587 + data1[i + 2] * 0.114);
        const y = (data2[i] * 0.299 + data2[i + 1] * 0.587 + data2[i + 2] * 0.114);

        sum_muX += x;
        sum_muY += y;
    }

    const muX = sum_muX / n;
    const muY = sum_muY / n;

    for (let i = 0; i < data1.length; i += 4) {
        const x = (data1[i] * 0.299 + data1[i + 1] * 0.587 + data1[i + 2] * 0.114);
        const y = (data2[i] * 0.299 + data2[i + 1] * 0.587 + data2[i + 2] * 0.114);

        sum_sigmaX2 += (x - muX) ** 2;
        sum_sigmaY2 += (y - muY) ** 2;
        sum_sigmaXY += (x - muX) * (y - muY);
    }

    // Sử dụng n thay vì n-1 cho phương sai và hiệp phương sai trong SSIM, vì mục đích là ước lượng tổng thể
    const sigmaX2 = sum_sigmaX2 / n;
    const sigmaY2 = sum_sigmaY2 / n;
    const sigmaXY = sum_sigmaXY / n;

    const numerator = (2 * muX * muY + C1) * (2 * sigmaXY + C2);
    const denominator = (muX ** 2 + muY ** 2 + C1) * (sigmaX2 + sigmaY2 + C2);

    // Tránh chia cho 0 nếu mẫu số là 0
    if (denominator === 0) {
        return 1; // Nếu cả hai ảnh đều hoàn toàn đen hoặc không có độ biến thiên, coi như giống nhau
    }

    return numerator / denominator;
}

// Hàm vẽ ảnh khác biệt (Difference Map)
function drawDifferenceHeatmap(imgData1, imgData2, canvas) {
    const ctx = canvas.getContext('2d');
    const width = Math.min(imgData1.width, imgData2.width);
    const height = Math.min(imgData1.height, imgData2.height);
    canvas.width = width;
    canvas.height = height;

    const diffImageData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i1 = (y * imgData1.width + x) * 4;
            const i2 = (y * imgData2.width + x) * 4;
            const i_diff = (y * width + x) * 4;

            const dr = Math.abs(imgData1.data[i1] - imgData2.data[i2]);
            const dg = Math.abs(imgData1.data[i1 + 1] - imgData2.data[i2 + 1]);
            const db = Math.abs(imgData1.data[i1 + 2] - imgData2.data[i2 + 2]);

            const intensity = Math.min(255, (dr + dg + db) / 3); // Cường độ khác biệt trung bình

            // Tạo màu đỏ cho sự khác biệt (càng khác càng đỏ)
            diffImageData.data[i_diff] = intensity;     // Red
            diffImageData.data[i_diff + 1] = 0;          // Green
            diffImageData.data[i_diff + 2] = 0;          // Blue
            diffImageData.data[i_diff + 3] = 255;        // Alpha
        }
    }
    ctx.putImageData(diffImageData, 0, 0);
}

// Hàm tạo Histogram
function createHistogram(imageData) {
    const hist = Array(256).fill(0);
    const len = imageData.data.length;
    for (let i = 0; i < len; i += 4) {
        // Chuyển đổi RGB sang grayscale để tính histogram (phương pháp độ sáng)
        const gray = Math.round((imageData.data[i] * 0.299 + imageData.data[i + 1] * 0.587 + imageData.data[i + 2] * 0.114));
        if (gray >= 0 && gray <= 255) {
            hist[gray]++;
        }
    }
    return hist;
}

// Hàm vẽ Histogram
function drawHistogram(hist, canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const max = Math.max(...hist);

    // Vẽ nền cho biểu đồ
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, w, h);

    // Vẽ các cột histogram
    ctx.fillStyle = 'steelblue';
    const barWidth = w / 256;
    for (let i = 0; i < 256; i++) {
        const barHeight = (hist[i] / max) * h;
        ctx.fillRect(i * barWidth, h - barHeight, barWidth, barHeight);
    }

    // Vẽ đường viền
    ctx.strokeStyle = '#ccc';
    ctx.strokeRect(0, 0, w, h);
}

// Hàm vẽ Heatmap (hiển thị vùng khác biệt)
function drawHeatmap(imgData1, imgData2, canvas) {
    const ctx = canvas.getContext('2d');
    const width = Math.min(imgData1.width, imgData2.width);
    const height = Math.min(imgData1.height, imgData2.height);
    canvas.width = width;
    canvas.height = height;

    const heatImageData = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i1 = (y * imgData1.width + x) * 4;
            const i2 = (y * imgData2.width + x) * 4;
            const i_heat = (y * width + x) * 4;

            const dr = Math.abs(imgData1.data[i1] - imgData2.data[i2]);
            const dg = Math.abs(imgData1.data[i1 + 1] - imgData2.data[i2 + 1]);
            const db = Math.abs(imgData1.data[i1 + 2] - imgData2.data[i2 + 2]);

            const totalDiff = (dr + dg + db) / 3; // Tổng khác biệt trung bình

            // Chuyển đổi khác biệt thành màu nóng
            // Càng lớn càng đỏ (nóng), càng nhỏ càng xanh (lạnh)
            let r = 0, g = 0, b = 0;
            // Ánh xạ từ 0-255 sang dải màu từ xanh -> vàng -> đỏ
            if (totalDiff < 85) { // Khoảng 0-84 (xanh-lam -> xanh-lục)
                g = Math.round(totalDiff * 3); // Tăng xanh lục
                b = Math.round(255 - totalDiff * 3); // Giảm xanh lam
                r = 0;
            } else if (totalDiff < 170) { // Khoảng 85-169 (xanh-lục -> vàng)
                r = Math.round((totalDiff - 85) * 3); // Tăng đỏ
                g = Math.round(255 - (totalDiff - 85) * 3); // Giảm xanh lục
                b = 0;
            } else { // Khoảng 170-255 (vàng -> đỏ)
                r = Math.round(255);
                g = Math.round(255 - (totalDiff - 170) * 3); // Giảm xanh lục (chậm hơn)
                b = 0;
            }

            heatImageData.data[i_heat] = r;
            heatImageData.data[i_heat + 1] = g;
            heatImageData.data[i_heat + 2] = b;
            heatImageData.data[i_heat + 3] = 255;
        }
    }
    ctx.putImageData(heatImageData, 0, 0);
}

// Hàm hiển thị thống kê ảnh gốc (luôn là lý tưởng)
function displayOriginalStats() {
    const div = document.getElementById('originalStats');
    div.innerHTML = `
        <p><strong>MSE:</strong> 0.00</p>
        <p><strong>PSNR:</strong> &infin; dB</p>
        <p><strong>SSIM:</strong> 1.00</p>
        <p><em>(Các thông số ảnh gốc)</em></p>
    `;
}

// Hàm hiển thị thống kê ảnh mã hóa
function displayEncodedStats(mse, psnr, ssim) {
    const div = document.getElementById('encodedStats');
    let comment = '';
    if (mse === 0) comment = 'Hai ảnh giống hệt.';
    else if (mse < 10) comment = 'Khác biệt rất nhỏ. Ảnh được bảo toàn tốt.';
    else if (mse < 100) comment = 'Có khác biệt nhỏ nhưng chấp nhận được. Chất lượng ảnh ít bị ảnh hưởng.';
    else comment = 'Có sự khác biệt đáng kể. Chất lượng ảnh bị ảnh hưởng rõ rệt.';

    div.innerHTML = `
        <p><strong>MSE:</strong> ${mse.toFixed(2)}</p>
        <p><strong>PSNR:</strong> ${psnr.toFixed(2)} dB</p>
        <p><strong>SSIM:</strong> ${ssim.toFixed(2)}</p> <p><em>Nhận xét: ${comment}</em></p>
    `;
}
function resetCompareTab() {
    console.log("Hàm resetCompareTab đã được gọi."); // Thêm dòng này để kiểm tra

    // Ẩn khu vực kết quả so sánh
    document.getElementById('compareResultArea').style.display = 'none';
    console.log("compareResultArea đã ẩn.");

    // HIỂN THỊ LẠI KHU VỰC TẢI ẢNH CHÍNH
    const compareUploadSections = document.getElementById('compareUploadSections');
    if (compareUploadSections) {
        compareUploadSections.style.display = 'block';
        console.log("Đã thiết lập display của compareUploadSections là 'block'.");
        console.log("Giá trị display hiện tại của compareUploadSections sau khi thiết lập:", compareUploadSections.style.display);
    } else {
        console.error("Lỗi: Không tìm thấy phần tử compareUploadSections.");
    }

    // ĐẢM BẢO CÁC KHU VỰC UPLOAD (dropzone) BÊN TRONG ĐƯỢC HIỂN THỊ LẠI (QUAN TRỌNG)
    const originalCompareUploadArea = document.getElementById('originalCompareUploadArea');
    if (originalCompareUploadArea) {
        originalCompareUploadArea.style.display = 'block';
        console.log("Đã thiết lập display của originalCompareUploadArea là 'block'.");
    } else {
        console.error("Lỗi: Không tìm thấy phần tử originalCompareUploadArea.");
    }

    const encodedCompareUploadArea = document.getElementById('encodedCompareUploadArea');
    if (encodedCompareUploadArea) {
        encodedCompareUploadArea.style.display = 'block';
        console.log("Đã thiết lập display của encodedCompareUploadArea là 'block'.");
    } else {
        console.error("Lỗi: Không tìm thấy phần tử encodedCompareUploadArea.");
    }

    // Xóa file đã chọn và reset hiển thị tên file
    document.getElementById('originalInput').value = '';
    document.getElementById('originalFileNameDisplay').textContent = 'Chưa chọn ảnh gốc nào';
    document.getElementById('encodedInputCompare').value = '';
    document.getElementById('encodedCompareFileNameDisplay').textContent = 'Chưa chọn ảnh mã hóa nào';

    // Ẩn các ảnh preview và xóa src của chúng
    document.getElementById('originalImagePreviewCompare').style.display = 'none';
    document.getElementById('originalImagePreviewCompare').src = '';
    document.getElementById('encodedImagePreviewCompare').style.display = 'none';
    document.getElementById('encodedImagePreviewCompare').src = '';

    // Xóa các ảnh hiển thị kết quả (ảnh lớn)
    document.getElementById('originalImageDisplay').src = '';
    document.getElementById('encodedImageDisplay').src = '';

    // Ẩn nút "So sánh ảnh khác"
    document.getElementById('compareNewImagesBtn').style.display = 'none';
    console.log("compareNewImagesBtn đã ẩn.");

    // Ẩn các hàng hình ảnh và biểu đồ (mặc định ẩn)
    document.getElementById('imagesRow').style.display = 'none';
    console.log("imagesRow đã ẩn.");
    document.getElementById('chartsRow').style.display = 'none';
    console.log("chartsRow đã ẩn.");


    // Xóa nội dung các canvas
    const differenceCanvas = document.getElementById('differenceCanvas');
    const histogramCanvas = document.getElementById('histogramCanvas');
    const heatmapCanvas = document.getElementById('heatmapCanvas');

    if (differenceCanvas) differenceCanvas.getContext('2d').clearRect(0, 0, differenceCanvas.width, differenceCanvas.height);
    if (histogramCanvas) histogramCanvas.getContext('2d').clearRect(0, 0, histogramCanvas.width, histogramCanvas.height);
    if (heatmapCanvas) heatmapCanvas.getContext('2d').clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);

    // Reset các giá trị thống kê
    document.getElementById('mseResult').textContent = 'N/A';
    document.getElementById('psnrResult').textContent = 'N/A';
    document.getElementById('ssimResult').textContent = 'N/A';
    document.getElementById('compareComment').textContent = '';

    // Xóa nội dung các khối thống kê ảnh chi tiết
    document.getElementById('originalStats').innerHTML = '';
    document.getElementById('encodedStats').innerHTML = '';
}

// --- Hàm chính để so sánh ảnh ---
function compareImages() {
    const originalFile = document.getElementById('originalInput').files[0];
    const encodedFile = document.getElementById('encodedInputCompare').files[0];
    const compareResultArea = document.getElementById('compareResultArea');
    const compareUploadSections = document.getElementById('compareUploadSections');

    if (!originalFile || !encodedFile) {
        alert("Vui lòng chọn cả ảnh gốc và ảnh đã mã hóa để so sánh.");
        return;
    }

    compareUploadSections.style.display = 'none';
    document.getElementById('originalImagePreviewCompare').style.display = 'none';
    document.getElementById('encodedImagePreviewCompare').style.display = 'none';

    const img1 = new Image();
    const img2 = new Image();
    let loadedCount = 0;

    function startComparison() {
        loadedCount++;
        if (loadedCount < 2) return;

        const c1 = document.createElement('canvas');
        const c2 = document.createElement('canvas');

        const minWidth = Math.min(img1.naturalWidth, img2.naturalWidth);
        const minHeight = Math.min(img1.naturalHeight, img2.naturalHeight);

        c1.width = minWidth;
        c1.height = minHeight;
        c2.width = minWidth;
        c2.height = minHeight;

        const ctx1 = c1.getContext('2d');
        const ctx2 = c2.getContext('2d');

        ctx1.drawImage(img1, 0, 0, minWidth, minHeight);
        ctx2.drawImage(img2, 0, 0, minWidth, minHeight);

        const imgData1 = ctx1.getImageData(0, 0, minWidth, minHeight);
        const imgData2 = ctx2.getImageData(0, 0, minWidth, minHeight);

        document.getElementById('originalImageDisplay').src = img1.src;
        document.getElementById('encodedImageDisplay').src = img2.src;

        document.getElementById('imagesRow').style.display = 'flex';
        document.getElementById('chartsRow').style.display = 'flex';

        drawDifferenceHeatmap(imgData1, imgData2, document.getElementById('differenceCanvas'));
        drawHistogram(createHistogram(imgData1), document.getElementById('histogramCanvas'));
        drawHeatmap(imgData1, imgData2, document.getElementById('heatmapCanvas'));

        const mse = calculateMSE(imgData1, imgData2);
        const psnr = calculatePSNR(mse);
        const ssimAvg = calculateSSIM_RGB(imgData1, imgData2);

        document.getElementById('mseResult').textContent = mse.toFixed(2);
        document.getElementById('psnrResult').textContent = psnr.toFixed(2);
        document.getElementById('ssimResult').textContent = ssimAvg.toFixed(2);

        let compareComment = '';
        if (ssimAvg > 0.99) compareComment = 'Hai ảnh gần như giống hệt nhau. Sự khác biệt là rất khó nhận thấy.';
        else if (ssimAvg > 0.95) compareComment = 'Có một chút khác biệt nhỏ nhưng hình ảnh vẫn rất tương đồng.';
        else if (ssimAvg > 0.85) compareComment = 'Có sự khác biệt rõ rệt giữa hai ảnh. Chất lượng hình ảnh bị ảnh hưởng nhẹ.';
        else compareComment = 'Sự khác biệt giữa hai ảnh là rất lớn. Chất lượng hình ảnh đã bị giảm đáng kể.';
        document.getElementById('compareComment').textContent = compareComment;

        displayOriginalStats();
        displayEncodedStats(mse, psnr, ssimAvg);

        compareResultArea.style.display = 'block';
        // HIỂN THỊ NÚT "SO SÁNH ẢNH KHÁC" KHI SO SÁNH XONG
        document.getElementById('compareNewImagesBtn').style.display = 'inline-block';
    }

    img1.onload = startComparison;
    img2.onload = startComparison;

    img1.onerror = () => { alert("Không thể tải ảnh gốc. Vui lòng kiểm tra lại tệp."); };
    img2.onerror = () => { alert("Không thể tải ảnh mã hóa. Vui lòng kiểm tra lại tệp."); };

    const reader1 = new FileReader();
    reader1.onload = e => { img1.src = e.target.result; };
    reader1.readAsDataURL(originalFile);

    const reader2 = new FileReader();
    reader2.onload = e => { img2.src = e.target.result; };
    reader2.readAsDataURL(encodedFile);
}

// Hàm chuyển đổi hiển thị mật khẩu
function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    if (!passwordInput) {
        console.error('Không tìm thấy input với ID:', inputId);
        return;
    }

    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    const toggleButton = passwordInput.nextElementSibling;
    if (toggleButton) {
        const icon = toggleButton.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    }
}

// Gắn Event Listeners khi DOM đã tải hoàn toàn
document.addEventListener('DOMContentLoaded', () => {
    // ... (Giữ nguyên các Event Listeners hiện có cho các tab và nút chính) ...
    document.getElementById('tabEncryptBtn').addEventListener('click', function() {
        showTab('encrypt', this);
    });
    document.getElementById('tabDecryptBtn').addEventListener('click', function() {
        showTab('decrypt', this);
    });
    document.getElementById('tabCompareBtn').addEventListener('click', function() {
        showTab('compare', this);
    });

    document.getElementById('encryptAndEmbedBtn').addEventListener('click', encryptAndEmbed);
    document.getElementById('handleDecodeBtn').addEventListener('click', handleDecode);
    document.getElementById('compareImagesBtn').addEventListener('click', compareImages); // Nút so sánh ban đầu

    document.getElementById('encryptSecretKeyBtn').addEventListener('click', encryptSecretKey);
    document.getElementById('copyEncryptedKeyBtn').addEventListener('click', copyEncryptedKey);

    // ... (Giữ nguyên các Event Listeners cho input file) ...
    document.getElementById('imageInput').addEventListener('change', function () {
        const file = this.files[0];
        const fileNameDisplay = document.getElementById('fileNameDisplay');
        const previewImage = document.getElementById('previewImage');
        const encryptUploadArea = document.getElementById('encryptUploadArea');

        if (!file) {
            fileNameDisplay.textContent = 'Chưa chọn ảnh nào';
            previewImage.style.display = 'none';
            previewImage.src = '';
            encryptUploadArea.style.display = 'block';
            return;
        }
        fileNameDisplay.textContent = file.name;
        const reader = new FileReader();
        reader.onload = e => {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
            encryptUploadArea.style.display = 'none';
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('encodedInput').addEventListener('change', function () {
        const file = this.files[0];
        const fileNameDisplay = document.getElementById('encodedFileNameDisplay');
        const decryptUploadArea = document.getElementById('decryptUploadArea');
        const decryptPreviewImage = document.getElementById('decryptPreviewImage');

        if (!file) {
            fileNameDisplay.textContent = 'Chưa chọn ảnh nào';
            decryptUploadArea.style.display = 'block';
            if (decryptPreviewImage) {
                decryptPreviewImage.style.display = 'none';
                decryptPreviewImage.src = '';
            }
            return;
        }
        fileNameDisplay.textContent = file.name;
        decryptUploadArea.style.display = 'none';

        const reader = new FileReader();
        reader.onload = e => {
            if (decryptPreviewImage) {
                decryptPreviewImage.src = e.target.result;
                decryptPreviewImage.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('originalInput').addEventListener('change', function () {
        const file = this.files[0];
        const fileNameDisplay = document.getElementById('originalFileNameDisplay');
        const originalCompareUploadArea = document.getElementById('originalCompareUploadArea');
        const originalImagePreviewCompare = document.getElementById('originalImagePreviewCompare');

        if (!file) {
            fileNameDisplay.textContent = 'Chưa chọn ảnh gốc nào';
            originalCompareUploadArea.style.display = 'block';
            if (originalImagePreviewCompare) {
                originalImagePreviewCompare.style.display = 'none';
                originalImagePreviewCompare.src = '';
            }
            return;
        }
        fileNameDisplay.textContent = file.name;
        originalCompareUploadArea.style.display = 'none';

        const reader = new FileReader();
        reader.onload = e => {
            if (originalImagePreviewCompare) {
                originalImagePreviewCompare.src = e.target.result;
                originalImagePreviewCompare.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('encodedInputCompare').addEventListener('change', function () {
        const file = this.files[0];
        const fileNameDisplay = document.getElementById('encodedCompareFileNameDisplay');
        const encodedCompareUploadArea = document.getElementById('encodedCompareUploadArea');
        const encodedImagePreviewCompare = document.getElementById('encodedImagePreviewCompare');

        if (!file) {
            fileNameDisplay.textContent = 'Chưa chọn ảnh mã hóa nào';
            encodedCompareUploadArea.style.display = 'block';
            if (encodedImagePreviewCompare) {
                encodedImagePreviewCompare.style.display = 'none';
                encodedImagePreviewCompare.src = '';
            }
            return;
        }
        fileNameDisplay.textContent = file.name;
        encodedCompareUploadArea.style.display = 'none';

        const reader = new FileReader();
        reader.onload = e => {
            if (encodedImagePreviewCompare) {
                encodedImagePreviewCompare.src = e.target.result;
                encodedImagePreviewCompare.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    });
    document.getElementById('compareNewImagesBtn').addEventListener('click', resetCompareTab);
});