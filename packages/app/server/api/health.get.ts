export default defineEventHandler(async (event) => {
  const { healthService } = useScope(event).cradle
  const report = await healthService.check()
  if (report.status !== 'ok') {
    setResponseStatus(event, 503)
  }
  return report
})
