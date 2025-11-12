package vchung.ph59842.app_datve.api;

/**
 * Cấu hình API
 * Thay đổi BASE_URL tại đây để kết nối với API server của bạn
 */
public class ApiConfig {
    // API Base URL
    public static final String BASE_URL = "https://unfocused-braeden-overstale.ngrok-free.dev/api/v1/";
    
    // Timeout settings (milliseconds)
    public static final int CONNECT_TIMEOUT = 30; // 30 seconds
    public static final int READ_TIMEOUT = 30; // 30 seconds
    public static final int WRITE_TIMEOUT = 30; // 30 seconds
}



