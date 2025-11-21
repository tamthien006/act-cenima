package vchung.ph59842.app_datve.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class Ticket {
    @SerializedName("_id")
    private String _id;
    
    @SerializedName("id")
    private String id;
    
    @SerializedName("ticketId")
    private String ticketId;
    
    @SerializedName("scheduleId")
    private String scheduleId;
    
    @SerializedName("seatNumbers")
    private List<String> seatNumbers;
    
    @SerializedName("totalPrice")
    private double totalPrice;
    
    @SerializedName("finalPrice")
    private double finalPrice;
    
    @SerializedName("discountAmount")
    private double discountAmount;
    
    @SerializedName("expiresAt")
    private String expiresAt;
    
    @SerializedName("status")
    private String status; // "pending", "confirmed", "cancelled", "refunded", "expired"
    
    @SerializedName("voucher")
    private VoucherInfo voucher;
    
    @SerializedName("combo")
    private ComboInfo combo;
    
    public Ticket() {}
    
    public String get_id() {
        return _id;
    }
    
    public void set_id(String _id) {
        this._id = _id;
    }
    
    public String getId() {
        return id != null ? id : (ticketId != null ? ticketId : _id);
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getTicketId() {
        return ticketId != null ? ticketId : getId();
    }
    
    public void setTicketId(String ticketId) {
        this.ticketId = ticketId;
    }
    
    public String getScheduleId() {
        return scheduleId;
    }
    
    public void setScheduleId(String scheduleId) {
        this.scheduleId = scheduleId;
    }
    
    public List<String> getSeatNumbers() {
        return seatNumbers;
    }
    
    public void setSeatNumbers(List<String> seatNumbers) {
        this.seatNumbers = seatNumbers;
    }
    
    public double getTotalPrice() {
        return totalPrice;
    }
    
    public void setTotalPrice(double totalPrice) {
        this.totalPrice = totalPrice;
    }
    
    public double getFinalPrice() {
        return finalPrice > 0 ? finalPrice : totalPrice;
    }
    
    public void setFinalPrice(double finalPrice) {
        this.finalPrice = finalPrice;
    }
    
    public double getDiscountAmount() {
        return discountAmount;
    }
    
    public void setDiscountAmount(double discountAmount) {
        this.discountAmount = discountAmount;
    }
    
    public String getExpiresAt() {
        return expiresAt;
    }
    
    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public VoucherInfo getVoucher() {
        return voucher;
    }
    
    public void setVoucher(VoucherInfo voucher) {
        this.voucher = voucher;
    }
    
    public ComboInfo getCombo() {
        return combo;
    }
    
    public void setCombo(ComboInfo combo) {
        this.combo = combo;
    }
    
    // Inner classes for nested objects
    public static class VoucherInfo {
        @SerializedName("code")
        private String code;
        
        @SerializedName("name")
        private String name;
        
        @SerializedName("discountType")
        private String discountType;
        
        @SerializedName("discountValue")
        private double discountValue;
        
        @SerializedName("maxDiscount")
        private Double maxDiscount;
        
        public String getCode() {
            return code;
        }
        
        public void setCode(String code) {
            this.code = code;
        }
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public String getDiscountType() {
            return discountType;
        }
        
        public void setDiscountType(String discountType) {
            this.discountType = discountType;
        }
        
        public double getDiscountValue() {
            return discountValue;
        }
        
        public void setDiscountValue(double discountValue) {
            this.discountValue = discountValue;
        }
        
        public Double getMaxDiscount() {
            return maxDiscount;
        }
        
        public void setMaxDiscount(Double maxDiscount) {
            this.maxDiscount = maxDiscount;
        }
    }
    
    public static class ComboInfo {
        @SerializedName("name")
        private String name;
        
        @SerializedName("qty")
        private int qty;
        
        @SerializedName("price")
        private double price;
        
        @SerializedName("total")
        private double total;
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public int getQty() {
            return qty;
        }
        
        public void setQty(int qty) {
            this.qty = qty;
        }
        
        public double getPrice() {
            return price;
        }
        
        public void setPrice(double price) {
            this.price = price;
        }
        
        public double getTotal() {
            return total;
        }
        
        public void setTotal(double total) {
            this.total = total;
        }
    }
}




