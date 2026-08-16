terraform {
  required_version = ">= 1.15.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "TicketDeck"
      Owner       = "AHS"
      Environment = "m2"
      CostCenter  = "TicketDeck-POC"
    }
  }
}