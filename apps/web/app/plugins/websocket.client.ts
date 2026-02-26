export default defineNuxtPlugin(() => {
  const token = useCookie("auth_token");

  if (token.value) {
    const { connect } = useWebSocket();
    connect();
  }
});
