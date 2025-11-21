package vchung.ph59842.app_datve.api;

import android.content.Context;

import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;
import vchung.ph59842.app_datve.api.interceptor.AuthInterceptor;

import java.util.concurrent.TimeUnit;

public class ApiClient {
    private static Retrofit retrofit = null;
    private static ApiService apiService = null;

    public static Retrofit getRetrofit(Context context) {
        if (retrofit == null) {
            HttpLoggingInterceptor loggingInterceptor = new HttpLoggingInterceptor();
            loggingInterceptor.setLevel(HttpLoggingInterceptor.Level.BODY);

            OkHttpClient okHttpClient = new OkHttpClient.Builder()
                    .addInterceptor(new AuthInterceptor(context))
                    .addInterceptor(loggingInterceptor)
                    .connectTimeout(ApiConfig.CONNECT_TIMEOUT, TimeUnit.SECONDS)
                    .readTimeout(ApiConfig.READ_TIMEOUT, TimeUnit.SECONDS)
                    .writeTimeout(ApiConfig.WRITE_TIMEOUT, TimeUnit.SECONDS)
                    .build();

            com.google.gson.Gson gson = new com.google.gson.GsonBuilder()

                    .create();
            
            retrofit = new Retrofit.Builder()
                    .baseUrl(ApiConfig.BASE_URL)
                    .client(okHttpClient)
                    .addConverterFactory(GsonConverterFactory.create(gson))
                    .build();
        }
        return retrofit;
    }

    public static ApiService getApiService(Context context) {
        if (apiService == null) {
            apiService = getRetrofit(context).create(ApiService.class);
        }
        return apiService;
    }

    public static void reset() {
        retrofit = null;
        apiService = null;
    }
}
