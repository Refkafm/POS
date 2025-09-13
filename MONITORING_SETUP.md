# POS System Monitoring Setup Guide

This guide provides comprehensive instructions for setting up and managing the monitoring infrastructure for the POS System using Prometheus, Grafana, Loki, and AlertManager.

## 📊 Monitoring Stack Overview

Our monitoring solution includes:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation and analysis
- **Promtail**: Log collection agent
- **AlertManager**: Alert routing and notifications
- **Node Exporter**: System metrics
- **cAdvisor**: Container metrics
- **MongoDB Exporter**: Database metrics
- **Redis Exporter**: Cache metrics

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- POS System running (backend and frontend)
- At least 4GB RAM available for monitoring stack
- 10GB disk space for metrics and logs storage

### 1. Start Monitoring Stack

```bash
# Navigate to monitoring directory
cd monitoring

# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Check service status
docker-compose -f docker-compose.monitoring.yml ps
```

### 2. Access Monitoring Services

| Service | URL | Default Credentials |
|---------|-----|--------------------|
| Grafana | http://localhost:3000 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| AlertManager | http://localhost:9093 | - |
| Loki | http://localhost:3100 | - |

### 3. Initial Configuration

1. **Login to Grafana**:
   - Navigate to http://localhost:3000
   - Login with admin/admin
   - Change default password when prompted

2. **Verify Data Sources**:
   - Go to Configuration → Data Sources
   - Confirm Prometheus and Loki are connected

3. **Import Dashboards**:
   - Dashboards are automatically provisioned
   - Check "POS System" folder for available dashboards

## 📈 Dashboard Overview

### POS System Overview Dashboard

The main dashboard provides:

- **System Status**: Service health indicators
- **Active Users**: Current session count
- **Sales Metrics**: Daily sales and revenue
- **Performance**: Response times and error rates
- **Infrastructure**: CPU, memory, and database metrics
- **Business Intelligence**: Sales trends and inventory alerts

### Key Metrics Monitored

#### Application Metrics
- HTTP request rate and response times
- Error rates by endpoint
- Active user sessions
- Sales transactions and revenue
- Inventory levels
- Cache hit/miss ratios

#### Infrastructure Metrics
- CPU and memory usage
- Disk space and I/O
- Network traffic
- Container resource usage
- Database connections and performance

#### Business Metrics
- Sales volume and trends
- Transaction success/failure rates
- Cash drawer discrepancies
- Refund rates
- Low inventory alerts

## 🚨 Alerting Configuration

### Alert Categories

1. **Critical Alerts** (Immediate notification):
   - Service downtime
   - Database connectivity issues
   - High error rates (>10%)

2. **Warning Alerts** (Standard notification):
   - High resource usage (CPU >80%, Memory >85%)
   - Slow response times (>2s)
   - Low inventory stock

3. **Info Alerts** (Daily digest):
   - Unusual sales patterns
   - Performance summaries

### Notification Channels

#### Email Configuration

1. Edit `monitoring/alertmanager/alertmanager.yml`:

```yaml
global:
  smtp_smarthost: 'your-smtp-server:587'
  smtp_from: 'pos-alerts@yourcompany.com'
  smtp_auth_username: 'your-username'
  smtp_auth_password: 'your-password'
```

2. Update receiver email addresses:

```yaml
receivers:
  - name: 'critical-alerts'
    email_configs:
      - to: 'admin@yourcompany.com,manager@yourcompany.com'
```

#### Slack Integration

1. Create a Slack webhook URL
2. Update AlertManager configuration:

```yaml
slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#pos-alerts'
```

#### SMS Notifications

For critical alerts, configure SMS via webhook:

```yaml
webhook_configs:
  - url: 'http://your-sms-service/webhook'
    send_resolved: true
```

## 📋 Log Management

### Log Collection

Promtail automatically collects logs from:

- Docker containers (all POS services)
- Application log files
- System logs (syslog)
- Web server logs (Nginx)
- Database logs (MongoDB)

### Log Querying in Grafana

#### Common LogQL Queries

```logql
# View backend errors
{job="pos-backend"} |= "ERROR"

# Monitor failed transactions
{job="pos-backend"} |= "transaction" |= "failed"

# Check authentication issues
{job="pos-backend"} |= "auth" |= "failed"

# View high response times
{job="pos-backend"} | json | responseTime > 2000

# Monitor database queries
{job="mongodb"} |= "query" | json | duration > 100
```

### Log Retention

- Default retention: 31 days
- Configurable in `monitoring/loki/loki-config.yml`
- Automatic cleanup of old logs

## 🔧 Configuration Management

### Environment Variables

Create `.env.monitoring` file:

```bash
# Grafana Configuration
GF_SECURITY_ADMIN_PASSWORD=your-secure-password
GF_SMTP_ENABLED=true
GF_SMTP_HOST=smtp.yourcompany.com:587
GF_SMTP_USER=grafana@yourcompany.com
GF_SMTP_PASSWORD=your-email-password

# Prometheus Configuration
PROMETHEUS_RETENTION_TIME=30d
PROMETHEUS_STORAGE_RETENTION_SIZE=10GB

# AlertManager Configuration
ALERT_SMTP_HOST=smtp.yourcompany.com:587
ALERT_SMTP_FROM=alerts@yourcompany.com
ALERT_SMTP_USERNAME=alerts@yourcompany.com
ALERT_SMTP_PASSWORD=your-email-password

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Custom Metrics

To add custom business metrics to your POS application:

1. **Backend Metrics** (Node.js with prom-client):

```javascript
const prometheus = require('prom-client');

// Sales counter
const salesCounter = new prometheus.Counter({
  name: 'pos_sales_total',
  help: 'Total number of sales transactions',
  labelNames: ['cashier', 'payment_method']
});

// Revenue gauge
const revenueGauge = new prometheus.Gauge({
  name: 'pos_sales_revenue_total',
  help: 'Total sales revenue',
  labelNames: ['period']
});

// Inventory gauge
const inventoryGauge = new prometheus.Gauge({
  name: 'pos_inventory_stock_level',
  help: 'Current stock level for products',
  labelNames: ['product_id', 'product_name']
});
```

2. **Expose Metrics Endpoint**:

```javascript
app.get('/api/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Prometheus Not Scraping Targets

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify network connectivity
docker exec prometheus wget -qO- http://backend:3001/api/metrics
```

#### 2. Grafana Dashboard Not Loading Data

- Verify Prometheus data source connection
- Check query syntax in dashboard panels
- Ensure time range is appropriate

#### 3. Alerts Not Firing

```bash
# Check AlertManager status
curl http://localhost:9093/api/v1/status

# View active alerts
curl http://localhost:9093/api/v1/alerts

# Check Prometheus rules
curl http://localhost:9090/api/v1/rules
```

#### 4. High Resource Usage

- Adjust retention periods
- Reduce scrape intervals
- Limit log collection scope

### Log Analysis

```bash
# View service logs
docker-compose -f docker-compose.monitoring.yml logs prometheus
docker-compose -f docker-compose.monitoring.yml logs grafana
docker-compose -f docker-compose.monitoring.yml logs loki

# Check disk usage
docker exec prometheus df -h /prometheus
docker exec loki df -h /loki
```

## 📊 Performance Optimization

### Prometheus Optimization

1. **Storage Configuration**:

```yaml
# prometheus.yml
global:
  scrape_interval: 30s  # Increase for less frequent scraping
  evaluation_interval: 30s

storage:
  tsdb:
    retention.time: 30d
    retention.size: 10GB
```

2. **Query Optimization**:

- Use recording rules for complex queries
- Limit query time ranges
- Use appropriate step intervals

### Grafana Optimization

1. **Dashboard Performance**:

- Limit panel queries
- Use template variables
- Set appropriate refresh intervals

2. **Resource Limits**:

```yaml
# docker-compose.monitoring.yml
grafana:
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '0.5'
```

## 🔐 Security Considerations

### Access Control

1. **Grafana Authentication**:

```ini
# grafana.ini
[auth]
disable_login_form = false
disable_signout_menu = false

[auth.basic]
enabled = true

[auth.ldap]
enabled = false
```

2. **Network Security**:

- Use reverse proxy for external access
- Enable HTTPS/TLS
- Restrict network access to monitoring ports

### Data Protection

- Encrypt sensitive configuration
- Use secrets management
- Regular backup of dashboards and configuration

## 📋 Maintenance Tasks

### Daily Tasks

- [ ] Check service health in Grafana
- [ ] Review critical alerts
- [ ] Monitor disk usage

### Weekly Tasks

- [ ] Review dashboard performance
- [ ] Analyze log patterns
- [ ] Update alert thresholds if needed

### Monthly Tasks

- [ ] Clean up old metrics and logs
- [ ] Review and update dashboards
- [ ] Performance optimization
- [ ] Security updates

## 📞 Support and Escalation

### Alert Escalation Matrix

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| Critical | 15 minutes | On-call engineer → Manager |
| Warning | 1 hour | Team lead → Manager |
| Info | Next business day | Team review |

### Contact Information

- **Primary On-call**: +1-XXX-XXX-XXXX
- **Secondary On-call**: +1-XXX-XXX-XXXX
- **Manager**: manager@yourcompany.com
- **DevOps Team**: devops@yourcompany.com

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/alertmanager/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [LogQL Documentation](https://grafana.com/docs/loki/latest/logql/)

---

**Note**: This monitoring setup provides comprehensive observability for your POS system. Customize the configuration based on your specific requirements and infrastructure setup.