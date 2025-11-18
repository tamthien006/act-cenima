package vchung.ph59842.app_datve.models;

import com.google.gson.annotations.SerializedName;

public class Voucher {
    @SerializedName("_id")
    private String _id;
    
    @SerializedName("id")
    private String id;
    
    @SerializedName("code")
    private String code;
    
    @SerializedName("name")
    private String name;
    
    @SerializedName("description")
    private String description;
    
    @SerializedName("discountType")
    private String discountType; // "percentage" or "fixed"
    
    @SerializedName("discountValue")
    private double discountValue;
    
    @SerializedName("maxDiscount")
    private Double maxDiscount;
    
    @SerializedName("minOrderAmount")
    private Double minOrderAmount;
    
    @SerializedName("endDate")
    private String endDate;
    
    @SerializedName("redeemedAt")
    private String redeemedAt;
    
    public Voucher() {}
    
    public String get_id() {
        return _id;
    }
    
    public void set_id(String _id) {
        this._id = _id;
    }
    
    public String getId() {
        return id != null ? id : _id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
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
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
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
    
    public Double getMinOrderAmount() {
        return minOrderAmount;
    }
    
    public void setMinOrderAmount(Double minOrderAmount) {
        this.minOrderAmount = minOrderAmount;
    }
    
    public String getEndDate() {
        return endDate;
    }
    
    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }
    
    public String getRedeemedAt() {
        return redeemedAt;
    }
    
    public void setRedeemedAt(String redeemedAt) {
        this.redeemedAt = redeemedAt;
    }
    
    public String getFormattedDiscount() {
        if ("percentage".equals(discountType)) {
            return (int) discountValue + "%";
        } else {
            int value = (int) discountValue;
            if (value >= 1000) {
                return (value / 1000) + "K";
            }
            return String.valueOf(value);
        }
    }
}




