<template>
  <view class="container">
    <view v-if="loading" class="loading">加载中...</view>

    <view v-else-if="!plant" class="empty">
      <text>未找到植物信息</text>
    </view>

    <view v-else>
      <!-- 植物信息卡片 -->
      <view class="info-card">
        <view class="info-header">
          <view class="plant-avatar">
            <image v-if="plant.avatarUrl" :src="plant.avatarUrl" mode="aspectFill" class="avatar-img" />
            <text v-else class="avatar-placeholder">{{ plant.name.charAt(0) }}</text>
          </view>
          <view class="info-title">
            <text class="plant-name">{{ plant.name }}</text>
            <text class="plant-common" v-if="plant.commonName">{{ plant.commonName }}</text>
            <text class="plant-species" v-if="plant.species">{{ plant.species }}</text>
          </view>
        </view>

        <view class="info-grid">
          <view class="info-item" v-if="plant.location">
            <text class="info-label">位置</text>
            <text class="info-value">{{ plant.location }}</text>
          </view>
          <view class="info-item" v-if="plant.potType">
            <text class="info-label">花盆</text>
            <text class="info-value">{{ plant.potType }}</text>
          </view>
          <view class="info-item" v-if="plant.soilType">
            <text class="info-label">土壤</text>
            <text class="info-value">{{ plant.soilType }}</text>
          </view>
          <view class="info-item" v-if="plant.lightCondition">
            <text class="info-label">光照</text>
            <text class="info-value">{{ plant.lightCondition }}</text>
          </view>
          <view class="info-item" v-if="plant.growthStage">
            <text class="info-label">生长阶段</text>
            <text class="info-value">{{ plant.growthStage }}</text>
          </view>
        </view>

        <view class="info-notes" v-if="plant.notes">
          <text class="notes-label">备注</text>
          <text class="notes-content">{{ plant.notes }}</text>
        </view>
      </view>

      <!-- 养护任务 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">养护任务</text>
        </view>

        <view v-if="tasks.length === 0" class="section-empty">
          <text>暂无养护任务</text>
        </view>

        <view v-else class="task-list">
          <view
            v-for="task in tasks"
            :key="task.id || ''"
            class="task-card"
            :class="{ 'task-done': task.status === 'done' }"
          >
            <view class="task-info">
              <text class="task-type">{{ taskTypeLabel(task.type) }}</text>
              <text class="task-title" v-if="task.title">{{ task.title }}</text>
              <text class="task-due" v-if="task.dueDate">截止: {{ formatDate(task.dueDate) }}</text>
              <text class="task-reason" v-if="task.reason">{{ task.reason }}</text>
            </view>
            <view class="task-actions" v-if="task.status === 'pending'">
              <view class="task-btn done-btn" @click="completeTask(task.id || '')">完成</view>
              <view class="task-btn skip-btn" @click="skipTask(task.id || '')">跳过</view>
            </view>
            <view class="task-status-done" v-else>
              <text>{{ task.status === 'done' ? '已完成' : '已跳过' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 最近观察 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">观察记录</text>
        </view>

        <view v-if="observations.length === 0" class="section-empty">
          <text>暂无观察记录</text>
        </view>

        <view v-else class="observation-list">
          <view
            v-for="obs in observations"
            :key="obs.id || ''"
            class="observation-card"
          >
            <text class="obs-date">{{ formatDate(obs.date as string) }}</text>
            <text class="obs-note" v-if="obs.userNote">{{ obs.userNote }}</text>
            <view class="obs-env" v-if="obs.temperature || obs.humidity || obs.soilMoisture">
              <text v-if="obs.temperature" class="env-tag">{{ obs.temperature }}°C</text>
              <text v-if="obs.humidity" class="env-tag">湿度 {{ obs.humidity }}%</text>
              <text v-if="obs.soilMoisture" class="env-tag">土壤: {{ obs.soilMoisture }}</text>
            </view>
            <view class="obs-symptoms" v-if="obs.symptoms && obs.symptoms.length > 0">
              <text class="symptom-tag" v-for="s in obs.symptoms" :key="s">{{ s }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { fetchPlant, fetchCareTasks, fetchObservations, updateCareTaskStatus } from "../../api";
import type { PlantQuery, CareTasksQuery, ObservationsQuery } from "../../gql/graphql";

const plant = ref<PlantQuery["plant"]>(null);
const tasks = ref<CareTasksQuery["careTasks"]>([]);
const observations = ref<ObservationsQuery["observations"]>([]);
const loading = ref(true);
const plantId = ref("");

const TASK_TYPE_MAP: Record<string, string> = {
  watering: "浇水",
  fertilizing: "施肥",
  pruning: "修剪",
  repotting: "换盆",
  observation: "观察",
};

function taskTypeLabel(type: string): string {
  return TASK_TYPE_MAP[type] || type;
}

function formatDate(dateStr: unknown): string {
  const d = new Date(dateStr as string);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function loadData() {
  loading.value = true;
  try {
    const [p, t, o] = await Promise.all([
      fetchPlant(plantId.value),
      fetchCareTasks(plantId.value),
      fetchObservations(plantId.value, 10),
    ]);
    plant.value = p;
    tasks.value = t;
    observations.value = o;
  } catch (e) {
    uni.showToast({ title: "加载失败", icon: "none" });
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function completeTask(id: string) {
  try {
    await updateCareTaskStatus(id, "done");
    uni.showToast({ title: "已完成", icon: "success" });
    tasks.value = await fetchCareTasks(plantId.value);
  } catch (e) {
    uni.showToast({ title: "操作失败", icon: "none" });
  }
}

async function skipTask(id: string) {
  try {
    await updateCareTaskStatus(id, "skipped");
    uni.showToast({ title: "已跳过", icon: "none" });
    tasks.value = await fetchCareTasks(plantId.value);
  } catch (e) {
    uni.showToast({ title: "操作失败", icon: "none" });
  }
}

onLoad((options) => {
  plantId.value = options?.id || "";
  if (plantId.value) {
    loadData();
  }
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 40rpx;
}

.loading, .empty {
  text-align: center;
  padding: 200rpx 0;
  color: #999;
}

.info-card {
  background-color: #fff;
  margin: 20rpx 30rpx;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.info-header {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.plant-avatar {
  width: 120rpx;
  height: 120rpx;
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
  font-size: 52rpx;
  color: #4caf50;
  font-weight: bold;
}

.info-title {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.plant-name {
  font-size: 38rpx;
  font-weight: bold;
  color: #333;
}

.plant-common {
  font-size: 28rpx;
  color: #666;
  margin-top: 6rpx;
}

.plant-species {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
  font-style: italic;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
}

.info-item {
  width: 50%;
  margin-bottom: 20rpx;
}

.info-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 6rpx;
}

.info-value {
  font-size: 28rpx;
  color: #333;
}

.info-notes {
  border-top: 1rpx solid #eee;
  padding-top: 20rpx;
  margin-top: 10rpx;
}

.notes-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.notes-content {
  font-size: 28rpx;
  color: #555;
  line-height: 1.6;
}

.section {
  margin: 20rpx 30rpx;
}

.section-header {
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.section-empty {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 60rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.task-list, .observation-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.task-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.03);
}

.task-done {
  opacity: 0.5;
}

.task-info {
  flex: 1;
}

.task-type {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.task-title {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-top: 6rpx;
}

.task-due {
  font-size: 24rpx;
  color: #f57c00;
  display: block;
  margin-top: 6rpx;
}

.task-reason {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 6rpx;
}

.task-actions {
  display: flex;
  gap: 16rpx;
  flex-shrink: 0;
}

.task-btn {
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
}

.done-btn {
  background-color: #4caf50;
  color: #fff;
}

.skip-btn {
  background-color: #f5f5f5;
  color: #999;
}

.task-status-done {
  flex-shrink: 0;
  font-size: 26rpx;
  color: #999;
}

.observation-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.03);
}

.obs-date {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.obs-note {
  font-size: 26rpx;
  color: #555;
  display: block;
  margin-bottom: 10rpx;
  line-height: 1.5;
}

.obs-env {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.env-tag {
  font-size: 24rpx;
  color: #1976d2;
  background-color: #e3f2fd;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
}

.obs-symptoms {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-top: 10rpx;
}

.symptom-tag {
  font-size: 24rpx;
  color: #f57c00;
  background-color: #fff3e0;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
}
</style>
