<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="form-label">名称 *</text>
        <input class="form-input" v-model="form.name" placeholder="给这株植物起个名字" />
      </view>

      <view class="form-item">
        <text class="form-label">俗名</text>
        <input class="form-input" v-model="form.commonName" placeholder="如：绿萝、多肉" />
      </view>

      <view class="form-item">
        <text class="form-label">学名</text>
        <input class="form-input" v-model="form.species" placeholder="如：Epipremnum aureum" />
      </view>

      <view class="form-item">
        <text class="form-label">摆放位置</text>
        <input class="form-input" v-model="form.location" placeholder="如：客厅窗台" />
      </view>

      <view class="form-item">
        <text class="form-label">花盆类型</text>
        <input class="form-input" v-model="form.potType" placeholder="如：陶盆、塑料盆" />
      </view>

      <view class="form-item">
        <text class="form-label">土壤类型</text>
        <input class="form-input" v-model="form.soilType" placeholder="如：泥炭土、混合土" />
      </view>

      <view class="form-item">
        <text class="form-label">光照条件</text>
        <picker :range="lightOptions" @change="onLightChange">
          <view class="form-picker">{{ form.lightCondition || '请选择' }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="form-label">生长阶段</text>
        <picker :range="growthOptions" @change="onGrowthChange">
          <view class="form-picker">{{ form.growthStage || '请选择' }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="form-label">备注</text>
        <textarea class="form-textarea" v-model="form.notes" placeholder="其他想记录的信息" />
      </view>
    </view>

    <view class="submit-btn" :class="{ disabled: submitting }" @click="submit">
      {{ submitting ? '提交中...' : '保存' }}
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { createPlant } from "../../api";
import { getUserId } from "../../utils/request";

const lightOptions = ["全日照", "半日照", "散射光", "阴生"];
const growthOptions = ["幼苗", "生长期", "成熟期", "开花期", "休眠期"];

const form = ref({
  name: "",
  commonName: "",
  species: "",
  location: "",
  potType: "",
  soilType: "",
  lightCondition: "",
  growthStage: "",
  notes: "",
});

const submitting = ref(false);

function onLightChange(e: any) {
  form.value.lightCondition = lightOptions[e.detail.value];
}

function onGrowthChange(e: any) {
  form.value.growthStage = growthOptions[e.detail.value];
}

async function submit() {
  if (!form.value.name.trim()) {
    uni.showToast({ title: "请填写名称", icon: "none" });
    return;
  }

  const userId = getUserId();
  if (!userId) {
    uni.showToast({ title: "请先登录", icon: "none" });
    return;
  }

  submitting.value = true;
  try {
    await createPlant({
      userId,
      name: form.value.name.trim(),
      commonName: form.value.commonName.trim() || undefined,
      species: form.value.species.trim() || undefined,
      location: form.value.location.trim() || undefined,
      potType: form.value.potType.trim() || undefined,
      soilType: form.value.soilType.trim() || undefined,
      lightCondition: form.value.lightCondition || undefined,
      growthStage: form.value.growthStage || undefined,
      notes: form.value.notes.trim() || undefined,
    });
    uni.showToast({ title: "添加成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (e) {
    uni.showToast({ title: "添加失败", icon: "none" });
    console.error(e);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx 30rpx 40rpx;
}

.form-card {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.form-input {
  border: 1rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #333;
}

.form-picker {
  border: 1rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #333;
}

.form-textarea {
  border: 1rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #333;
  width: 100%;
  height: 160rpx;
}

.submit-btn {
  margin-top: 40rpx;
  background-color: #4caf50;
  color: #fff;
  text-align: center;
  padding: 26rpx 0;
  border-radius: 40rpx;
  font-size: 32rpx;
  font-weight: bold;
}

.submit-btn.disabled {
  opacity: 0.5;
}
</style>
