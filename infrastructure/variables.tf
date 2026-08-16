variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "tkt-ahs"
}

variable "vpc_cidr" {
  description = "CIDR block for the TicketDeck VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "ecr_repository_url" {
  description = "ECR repository URL for the TicketDeck API"
  type        = string
}

variable "image_tag" {
  description = "Git commit SHA used as the Docker image tag"
  type        = string
}