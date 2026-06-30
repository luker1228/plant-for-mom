<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { createUser, userByExternalId } from "./api";
import { getUserId, setUserId } from "./utils/request";

onLaunch(async () => {
  console.log("App Launch");
  await ensureUser();
});

onShow(() => {
  console.log("App Show");
});

onHide(() => {
  console.log("App Hide");
});

async function ensureUser() {
  const existingId = getUserId();
  if (existingId) return;

  try {
    const loginRes = await uni.login({ provider: "weixin" });
    const externalId = `wx_${loginRes.code}`;

    const existing = await userByExternalId(externalId);
    if (existing?.id) {
      setUserId(existing.id);
      return;
    }

    const user = await createUser(externalId);
    if (user.id) setUserId(user.id);
  } catch (e) {
    console.error("用户初始化失败:", e);
  }
}
</script>

<style>
page {
  background-color: #f5f5f5;
}
</style>
