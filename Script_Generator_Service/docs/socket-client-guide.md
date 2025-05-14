# Hướng dẫn kết nối Socket.IO với Script Generator Service

## Mục lục
1. [Giới thiệu](#giới-thiệu)
2. [Cài đặt](#cài-đặt)
3. [Kết nối Socket.IO](#kết-nối-socketio)
4. [Đăng ký Job](#đăng-ký-job)
5. [Nhận kết quả](#nhận-kết-quả)
6. [Ví dụ sử dụng](#ví-dụ-sử-dụng)
7. [Lưu ý quan trọng](#lưu-ý-quan-trọng)
8. [Quy trình xử lý](#quy-trình-xử-lý)

## Giới thiệu

Tài liệu này hướng dẫn cách kết nối và tương tác với Script Generator Service thông qua WebSocket sử dụng Socket.IO. Service này cho phép client đăng ký nhận kết quả tạo script theo thời gian thực.

## Cài đặt

```bash
# Cài đặt Socket.IO client
npm install socket.io-client
```

## Kết nối Socket.IO

```javascript
// Sử dụng Socket.IO client
import { io } from "socket.io-client";

// Kết nối tới server
const socket = io("https://scriptservice-production-d87f.up.railway.app", {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Xử lý sự kiện kết nối
socket.on("connect", () => {
  console.log("Đã kết nối tới server với ID:", socket.id);
});

// Xử lý acknowledgment khi kết nối thành công
socket.on("connection_ack", (ack) => {
  console.log("Nhận được xác nhận kết nối:", ack);
  if (ack.status === 'success') {
    console.log("Kết nối thành công với socket ID:", ack.socketId);
    // Có thể tiếp tục đăng ký job ở đây
  } else {
    console.error("Lỗi kết nối:", ack.message);
    // Xử lý lỗi kết nối
  }
});

// Xử lý sự kiện ngắt kết nối
socket.on("disconnect", () => {
  console.log("Mất kết nối với server");
});

// Xử lý lỗi kết nối
socket.on("connect_error", (error) => {
  console.error("Lỗi kết nối:", error);
});
```

## Đăng ký Job

Sau khi kết nối thành công và nhận được `connection_ack`, client cần đăng ký `jobId` để nhận kết quả:

```javascript
// Đăng ký jobId để nhận kết quả
function registerJob(jobId) {
  return new Promise((resolve, reject) => {
    socket.emit("register", jobId, (ack) => {
      console.log("Nhận được xác nhận đăng ký job:", ack);
      if (ack.status === 'success') {
        console.log(`Đã đăng ký thành công cho job: ${ack.jobId}`);
        resolve(ack);
      } else {
        console.error(`Lỗi đăng ký job: ${ack.message}`);
        reject(new Error(ack.message));
      }
    });
  });
}

// Sử dụng với async/await
async function createScript(jobId, scriptData) {
  try {
    // Đăng ký job trước
    await registerJob(jobId);
    
    // Sau khi đăng ký thành công mới gửi request tạo script
    const response = await fetch('/api/scripts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jobId,
        ...scriptData
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Lỗi trong quá trình tạo script:', error);
    throw error;
  }
}
```

## Nhận kết quả

```javascript
// Lắng nghe sự kiện scriptResult để nhận kết quả
socket.on("scriptResult", (result) => {
  console.log("Nhận được kết quả:", result);
  
  // Cấu trúc result:
  {
    job_id: string,        // ID của job
    status: number,        // HTTP status code (201: thành công, 500: lỗi)
    data: {               // Dữ liệu kết quả (khi status = 201)
      scriptId: string,
      topic: string,
      title: string,
      description: string,
      script: string,
      status: string
    },
    error: string | null,  // Thông báo lỗi (nếu có)
    timestamp: string     // Thời gian nhận kết quả
  }
});
```

## Ví dụ sử dụng

```javascript
import { io } from "socket.io-client";

class ScriptGeneratorClient {
  constructor(serverUrl) {
    this.socket = io(serverUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Xử lý kết nối
    this.socket.on("connect", () => {
      console.log("Đã kết nối tới server với ID:", this.socket.id);
    });

    // Xử lý acknowledgment kết nối
    this.socket.on("connection_ack", (ack) => {
      console.log("Nhận được xác nhận kết nối:", ack);
      if (ack.status === 'success') {
        console.log("Kết nối thành công với socket ID:", ack.socketId);
      } else {
        console.error("Lỗi kết nối:", ack.message);
      }
    });

    // Xử lý ngắt kết nối
    this.socket.on("disconnect", () => {
      console.log("Mất kết nối với server");
    });

    // Xử lý lỗi
    this.socket.on("connect_error", (error) => {
      console.error("Lỗi kết nối:", error);
    });

    // Xử lý nhận kết quả
    this.socket.on("scriptResult", this.handleScriptResult.bind(this));
  }

  // Đăng ký job
  async registerJob(jobId) {
    return new Promise((resolve, reject) => {
      this.socket.emit("register", jobId, (ack) => {
        console.log("Nhận được xác nhận đăng ký job:", ack);
        if (ack.status === 'success') {
          console.log(`Đã đăng ký thành công cho job: ${ack.jobId}`);
          resolve(ack);
        } else {
          console.error(`Lỗi đăng ký job: ${ack.message}`);
          reject(new Error(ack.message));
        }
      });
    });
  }

  // Tạo script
  async createScript(jobId, scriptData) {
    try {
      // Đăng ký job trước
      await this.registerJob(jobId);
      
      // Sau khi đăng ký thành công mới gửi request
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId,
          ...scriptData
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Lỗi trong quá trình tạo script:', error);
      throw error;
    }
  }

  // Xử lý kết quả
  handleScriptResult(result) {
    console.log("Nhận được kết quả:", result);
    
    if (result.status === 201) {
      // Xử lý kết quả thành công
      console.log("Script đã được tạo:", result.data);
    } else if (result.status === 500) {
      // Xử lý lỗi
      console.error("Lỗi tạo script:", result.error);
    }
  }

  // Ngắt kết nối
  disconnect() {
    this.socket.disconnect();
  }
}

// Sử dụng
const client = new ScriptGeneratorClient("https://scriptservice-production-d87f.up.railway.app");

// Tạo script
async function generateScript() {
  try {
    const jobId = "job_" + Date.now();
    const result = await client.createScript(jobId, {
      userId: "user123",
      topic: "Example Topic",
      audience: "general",
      style: "informative",
      sources: [],
      language: "vi",
      length: "medium"
    });
    console.log("Script generation initiated:", result);
  } catch (error) {
    console.error("Error generating script:", error);
  }
}

// Gọi hàm tạo script
generateScript();
```

## Lưu ý quan trọng

### 1. Quy trình xử lý
- Kết nối socket -> Nhận connection_ack -> Đăng ký job -> Nhận register_ack -> Gửi request tạo script
- Không được gửi request tạo script trước khi nhận được register_ack thành công

### 2. Thời điểm đăng ký job
- Nên đăng ký job ngay sau khi nhận được connection_ack thành công
- Đăng ký trước khi gửi request tạo script
- Sử dụng Promise để đảm bảo thứ tự thực hiện

### 3. Xử lý reconnect
- Client tự động thử kết nối lại khi mất kết nối
- Cần đăng ký lại job sau khi kết nối lại thành công
- Nên lưu trữ jobId để đăng ký lại khi cần

### 4. Bảo mật
- Trong môi trường production, nên giới hạn origin của WebSocket
- Có thể thêm authentication token vào kết nối socket
- Xác thực jobId trước khi đăng ký

### 5. Error handling
- Luôn xử lý các trường hợp lỗi từ server
- Kiểm tra status trong acknowledgment
- Xử lý timeout cho các operation
- Log đầy đủ thông tin lỗi để debug

### 6. Cleanup
- Nên ngắt kết nối socket khi không cần thiết
- Xử lý cleanup khi component unmount (nếu dùng trong React)
- Hủy đăng ký job khi không cần thiết

### 7. Các trạng thái kết quả
- `status: 201`: Script được tạo thành công
- `status: 500`: Có lỗi xảy ra trong quá trình tạo script
- `error: null`: Không có lỗi
- `error: string`: Thông báo lỗi cụ thể

### 8. Các sự kiện socket
- `connect`: Khi kết nối thành công
- `connection_ack`: Khi nhận được xác nhận kết nối
- `disconnect`: Khi mất kết nối
- `connect_error`: Khi có lỗi kết nối
- `scriptResult`: Khi nhận được kết quả tạo script

## Quy trình xử lý

1. **Kết nối Socket**
   - Client kết nối tới server
   - Server gửi connection_ack
   - Client xác nhận kết nối thành công

2. **Đăng ký Job**
   - Client gửi yêu cầu đăng ký job
   - Server xử lý và gửi register_ack
   - Client xác nhận đăng ký thành công

3. **Tạo Script**
   - Client gửi request tạo script
   - Server xử lý và đưa vào queue
   - Server xử lý message từ queue
   - Server gửi kết quả qua socket

4. **Xử lý Kết quả**
   - Client nhận kết quả qua sự kiện scriptResult
   - Client xử lý kết quả dựa trên status
   - Client thực hiện các action tiếp theo

5. **Cleanup**
   - Client ngắt kết nối khi không cần thiết
   - Server xóa connection khỏi activeConnections 