output "alb_dns_name" {
  description = "DNS name of the TicketDeck Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "target_group_arn" {
  description = "ARN of the TicketDeck target group"
  value       = aws_lb_target_group.api.arn
}