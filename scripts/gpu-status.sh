#!/usr/bin/env bash
# Shows the GPU memory split between the local AI services.
nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader
echo "---"
nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv,noheader