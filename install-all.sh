#!/bin/bash

# Copyright (c) 2020, Arm Limited and affiliates.
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

for dir in * ; do
  if [[ -d "$dir" && ! -L "$dir" ]]; then
  	echo "Installing $dir..."
    cd $dir
    cp devicejs.json package.json
    rm -rf node_modules
    rm -f package-lock.json
    if npm install > "../"$dir"_npm_install.log" 2>&1; then
    	echo "Successfully installed $dir! npm logs are at "$dir"_npm_install.log"
    	cd ..
    else
    	echo "Failed to install $dir. npm logs are at "$dir"_npm_install.log"
    	exit 1
    fi
  fi;
done
