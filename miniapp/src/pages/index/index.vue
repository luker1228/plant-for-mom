<template>
  <view class="container">
    <view class="header">
      <text class="header-title">我的植物</text>
      <view class="add-btn" @click="goAddPlant">+ 添加</view>
    </view>

    <view v-if="loading" class="loading">加载中...</view>

    <view v-else-if="plants.length === 0" class="empty">
      <text class="empty-text">还没有添加植物</text>
      <view class="empty-btn" @click="goAddPlant">添加第一株植物</view>
    </view>

    <view v-else class="plant-list">
      <view
        v-for="plant in plants"
        :key="plant.id || ''"
        class="plant-card"
        @click="goDetail(plant.id || '')"
      >
        <view class="plant-avatar">
          <image v-if="plant.avatarUrl" :src="plant.avatarUrl" mode="aspectFill" class="avatar-img" />
          <text v-else class="avatar-placeholder">{{ plant.name.charAt(0) }}</text>
        </view>
        <view class="plant-info">
          <text class="plant-name">{{ plant.name }}</text>
          <text class="plant-species" v-if="plant.commonName">{{ plant.commonName }}</text>
          <text class="plant-species" v-else-if="plant.species">{{ plant.species }}</text>
          <text class="plant-location" v-if="plant.location">{{ plant.location }}</text>
        </view>
        <view class="plant-status" :class="statusClass(plant.lifecycleStatus)">
          <text class="status-text">{{ statusLabel(plant.lifecycleStatus) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { fetchPlants } from "../../api";
import { getUserId } from "../../utils/request";
import type { PlantsQuery } from "../../gql/graphql";

const plants = ref<PlantsQuery["plants"]>([]);
const loading = ref(true);

const STATUS_MAP: Record<string, string> = {
  unknown_plant: "待识别",
  identified: "已识别",
  profile_created: "已建档",
  care_plan_created: "已排程",
  observing: "观察中",
  need_action: "需处理",
  follow_up_scheduled: "跟进中",
};

function statusLabel(status: string): string {
  return STATUS_MAP[status] || status;
}

function statusClass(status: string): string {
  if (status === "need_action") return "status-warning";
  if (status === "observing" || status === "follow_up_scheduled") return "status-info";
  return "status-normal";
}

async function loadPlants() {
  loading.value = true;
  const userId = getUserId();
  if (!userId) {
    loading.value = false;
    plants.value = [];
    return;
  }
  try {
    plants.value = await fetchPlants(userId);
  } catch (e) {
    uni.showToast({ title: "加载失败", icon: "none" });
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function goAddPlant() {
  const userId = getUserId();
  if (!userId) {
    uni.showToast({ title: "请先登录", icon: "none" });
    return;
  }
  uni.navigateTo({ url: "/pages/add-plant/index" });
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/plant-detail/index?id=${id}` });
}

onShow(() => {
  loadPlants();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 40rpx;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 40rpx;
  background-color: #4caf50;
}

.header-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
}

.add-btn {
  padding: 12rpx 30rpx;
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: 30rpx;
  color: #ffffff;
  font-size: 28rpx;
}

.loading {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 150rpx 0;
}

.empty-text {
  color: #999;
  font-size: 30rpx;
  margin-bottom: 40rpx;
}

.empty-btn {
  padding: 20rpx 50rpx;
  background-color: #4caf50;
  color: #fff;
  border-radius: 40rpx;
  font-size: 30rpx;
}

.plant-list {
  padding: 20rpx 30rpx;
}

.plant-card {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.plant-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #e8f5e9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-placeholder {
  font-size: 44rpx;
  color: #4caf50;
  font-weight: bold;
}

.plant-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.plant-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.plant-species {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 4rpx;
}

.plant-location {
  font-size: 24rpx;
  color: #999;
}

.plant-status {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
}

.status-normal {
  background-color: #e8f5e9;
}

.status-normal .status-text {
  color: #4caf50;
}

.status-info {
  background-color: #e3f2fd;
}

.status-info .status-text {
  color: #1976d2;
}

.status-warning {
  background-color: #fff3e0;
}

.status-warning .status-text {
  color: #f57c00;
}

.status-text {
  font-size: 24rpx;
}
</style>
