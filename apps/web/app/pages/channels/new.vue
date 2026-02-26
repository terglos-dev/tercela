<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('channels.addChannel')" icon="i-lucide-plus">
        <template #left>
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            to="/channels"
          />
        </template>
        <template #right>
          <GlobalControls />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-2xl">
        <!-- Step 1: Login with Meta -->
        <template v-if="step === 'login'">
          <div class="space-y-6">
            <UButton
              size="lg"
              color="primary"
              block
              icon="i-lucide-log-in"
              :label="metaLoading ? $t('channels.metaConnecting') : $t('channels.connectMeta')"
              :loading="metaLoading"
              :disabled="!hasFbSdk"
              @click="onMetaLogin"
            />

            <p v-if="!hasFbSdk" class="text-sm text-[var(--ui-text-dimmed)]">
              Facebook App ID not configured.
            </p>
          </div>
        </template>

        <!-- Step 2: Select phone number -->
        <template v-if="step === 'select'">
          <div class="space-y-6">
            <div class="flex items-center gap-2 mb-2">
              <UButton
                icon="i-lucide-arrow-left"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="step = 'login'"
              />
              <h3 class="text-lg font-medium">{{ $t('channels.selectNumber') }}</h3>
            </div>

            <div v-if="metaLoading" class="text-center py-8 text-[var(--ui-text-dimmed)]">
              {{ $t('channels.loadingAccounts') }}
            </div>

            <div v-else-if="wabaAccounts.length === 0" class="text-center py-8 text-[var(--ui-text-dimmed)]">
              {{ $t('channels.noAccountsFound') }}
            </div>

            <div v-else class="space-y-4">
              <div v-for="waba in wabaAccounts" :key="waba.id">
                <p class="text-sm font-medium text-[var(--ui-text-dimmed)] mb-2">{{ waba.name }}</p>
                <div class="space-y-2">
                  <div
                    v-for="phone in waba.phone_numbers"
                    :key="phone.id"
                    class="flex items-center justify-between p-3 border border-[var(--ui-border)] rounded-lg cursor-pointer hover:bg-[var(--ui-bg-elevated)] transition-colors"
                    :class="{ 'ring-2 ring-[var(--ui-primary)]': selectedPhone?.id === phone.id }"
                    @click="selectPhone(waba, phone)"
                  >
                    <div>
                      <p class="font-medium">{{ phone.verified_name }}</p>
                      <p class="text-sm text-[var(--ui-text-dimmed)]">{{ phoneWithFlag(phone.display_phone_number) }}</p>
                    </div>
                    <UBadge v-if="phone.quality_rating" :label="phone.quality_rating" variant="subtle" size="sm" />
                  </div>
                </div>
              </div>
            </div>

            <template v-if="selectedPhone">
              <UFormField :label="$t('channels.name')">
                <UInput
                  v-model="metaForm.name"
                  :placeholder="selectedPhone.verified_name"
                  class="w-full"
                />
              </UFormField>

              <UButton
                color="primary"
                block
                icon="i-lucide-check"
                :label="connecting ? $t('channels.metaConnecting') : $t('channels.connectNumber')"
                :loading="connecting"
                @click="onConnectSelected"
              />
            </template>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { phoneWithFlag } from "~/utils/phone";

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { fetchMetaAccounts, connectMeta } = useChannels();

const step = ref<"login" | "select">("login");
const metaLoading = ref(false);
const connecting = ref(false);
const hasFbSdk = ref(false);

// Meta OAuth token (kept in memory only, never persisted)
const metaAccessToken = ref("");

// WABA accounts + phone numbers fetched from Graph API
const wabaAccounts = ref<{
  id: string;
  name: string;
  phone_numbers: { id: string; display_phone_number: string; verified_name: string; quality_rating?: string }[];
}[]>([]);

const selectedPhone = ref<{ id: string; display_phone_number: string; verified_name: string } | null>(null);
const selectedWabaId = ref("");

const metaForm = reactive({ name: "" });

onMounted(() => {
  const { $fb: fb } = useNuxtApp();
  hasFbSdk.value = !!fb;
});

function selectPhone(waba: { id: string }, phone: { id: string; display_phone_number: string; verified_name: string }) {
  selectedPhone.value = phone;
  selectedWabaId.value = waba.id;
  metaForm.name = phone.verified_name;
}

async function onMetaLogin() {
  const { $fb } = useNuxtApp();
  if (!$fb) return;
  metaLoading.value = true;

  try {
    const response = await ($fb as { login: (opts: Record<string, unknown>) => Promise<{ status: string; authResponse?: { accessToken?: string } }> }).login({
      scope: "business_management,whatsapp_business_management,whatsapp_business_messaging",
    });

    if (response.status !== "connected" || !response.authResponse?.accessToken) {
      toast.add({ title: t("channels.metaError"), color: "error" });
      return;
    }

    metaAccessToken.value = response.authResponse.accessToken;

    const accounts = await fetchMetaAccounts(metaAccessToken.value);
    wabaAccounts.value = accounts;
    step.value = "select";
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("channels.metaError");
    toast.add({ title: message, color: "error" });
  } finally {
    metaLoading.value = false;
  }
}

async function onConnectSelected() {
  if (!selectedPhone.value || !selectedWabaId.value) return;
  connecting.value = true;

  try {
    await connectMeta({
      accessToken: metaAccessToken.value,
      phoneNumberId: selectedPhone.value.id,
      wabaId: selectedWabaId.value,
      name: metaForm.name || selectedPhone.value.verified_name,
    });

    toast.add({ title: t("channels.metaSuccess"), color: "success" });
    router.push("/channels");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("channels.metaError");
    toast.add({ title: message, color: "error" });
  } finally {
    connecting.value = false;
  }
}
</script>
